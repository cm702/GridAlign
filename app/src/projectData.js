import dominionData from '../../new_data/processed/dominion_energy_south_carolina.json' with { type: 'json' }
import georgiaData from '../../new_data/processed/georgia_power.json' with { type: 'json' }

export const SCREENING_DISTANCE_KM = 40
const EARTH_RADIUS_KM = 6371.0088

export function formatDescriptionKm(description) {
  return description.replace(
    /(\d+(?:\.\d+)?)\s*(?:miles?|mi\.?)(?![a-z])/gi,
    (_, miles) => `${(Number(miles) * 1.60934).toFixed(1)} km`,
  )
}

export function parseDateWindow(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const normalized = value.trim()
  const quarter = normalized.match(/^Q([1-4])\s+(\d{4})$/i)
  const year = normalized.match(/^(\d{4})$/)

  if (quarter) {
    const startMonth = (Number(quarter[1]) - 1) * 3
    return {
      start: new Date(Date.UTC(Number(quarter[2]), startMonth, 1)),
      end: new Date(Date.UTC(Number(quarter[2]), startMonth + 3, 0)),
    }
  }
  if (year) {
    return {
      start: new Date(Date.UTC(Number(year[1]), 0, 1)),
      end: new Date(Date.UTC(Number(year[1]), 11, 31)),
    }
  }

  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const shortDate = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!isoDate && !shortDate) return null
  const yearValue = Number(isoDate?.[1] ?? shortDate[3])
  const month = Number(isoDate?.[2] ?? shortDate[1])
  const day = Number(isoDate?.[3] ?? shortDate[2])
  const fullYear = !isoDate && yearValue < 100 ? yearValue + 2000 : yearValue
  const date = new Date(Date.UTC(fullYear, month - 1, day))
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return { start: date, end: date }
}

function distanceKm(pointA, pointB) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(pointB.lat - pointA.lat)
  const longitudeDelta = toRadians(pointB.lon - pointA.lon)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(pointA.lat)) *
      Math.cos(toRadians(pointB.lat)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

function validCoordinates(record) {
  return (record.coordinates ?? [])
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        point.latitude >= -90 &&
        point.latitude <= 90 &&
        point.longitude >= -180 &&
        point.longitude <= 180,
    )
    .map((point, index) => ({
      name:
        record.coordinates.length === 1
          ? record.location || record.city || `Listed coordinate ${index + 1}`
          : `${record.location || record.city || 'Project location'} · listed point ${index + 1}`,
      lat: point.latitude,
      lon: point.longitude,
    }))
}

function parseUsd(value) {
  if (typeof value !== 'string') return null
  const amount = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function sourceDetails(record, utility) {
  const source = record.sources?.[0]
  const sourceFile = source?.file_name ?? ''
  const sourceTitle = sourceFile
    ? sourceFile.replace(/\.pdf$/i, '').replaceAll('-', ' ').replaceAll('_', ' ')
    : 'Public utility source'
  const page = Number.isInteger(source?.page) ? `, p. ${source.page}` : ''

  return {
    sourceReference: `${sourceTitle}${page}`,
    sourceUrl:
      utility === 'Georgia Power'
        ? 'https://www.georgiapower.com/about/grid-reliability/grid-improvements/grid-projects/transmission-projects.html'
        : 'https://www.scrtp.com/',
  }
}

function toProject(record, utility, index) {
  const sites = validCoordinates(record)
  if (sites.length === 0) return null
  const { sourceReference, sourceUrl } = sourceDetails(record, utility)
  const costSource = record.estimated_cost ? `${sourceReference} · project estimate` : null
  const county = record.county?.trim()
  const region = [record.location?.trim(), county].filter(Boolean).join(', ') || record.state

  return {
    id: `${utility === 'Georgia Power' ? 'GPC' : 'DESC'}_${index + 1}`,
    utility,
    state: record.state === 'Georgia' ? 'GA' : record.state,
    projectName: record.project_name,
    aliases: record.aliases ?? [],
    projectType: record.project_type ?? 'Project type not supplied',
    description: record.description ?? '',
    status: record.status ?? 'Not supplied',
    region,
    lat: sites[0].lat,
    lon: sites[0].lon,
    sites,
    startDate: record.start_date ?? null,
    inServiceDate: record.end_date ?? null,
    dateWindow: parseDateWindow(record.end_date) ?? parseDateWindow(record.start_date),
    estimatedCostUsd: parseUsd(record.estimated_cost),
    costSource,
    costDisclosure: record.estimated_cost
      ? `Reported project estimate: ${record.estimated_cost}`
      : 'Not reported in supplied source',
    sourceReference,
    sourceUrl,
  }
}

function buildProjects(records, utility) {
  return records.projects
    .map((record, index) => toProject(record, utility, index))
    .filter(Boolean)
}

function getScheduleGap(projectA, projectB) {
  if (!projectA.dateWindow || !projectB.dateWindow) return null
  const { start: startA, end: endA } = projectA.dateWindow
  const { start: startB, end: endB } = projectB.dateWindow
  if (startA <= endB && startB <= endA) return 0
  const difference = startA > endB ? startA - endB : startB - endA
  return Math.ceil(difference / 86_400_000)
}

function nearestProjectPoints(projectA, projectB) {
  let nearestDistance = Number.POSITIVE_INFINITY
  let nearestPointA = null
  let nearestPointB = null
  for (const pointA of projectA.sites) {
    for (const pointB of projectB.sites) {
      const candidateDistance = distanceKm(pointA, pointB)
      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance
        nearestPointA = pointA
        nearestPointB = pointB
      }
    }
  }
  return { distanceKm: nearestDistance, nearestPointA, nearestPointB }
}

export const COORDINATION_DISTANCE_TIERS = [
  {
    key: 'crossing',
    thresholdKm: 0.1,
    title: 'Near-coincident points',
    range: '< 0.1 km',
    share: 'Verify route crossings, outage timing, and crossing structures',
    descriptor:
      'Point proximity does not prove a crossing. Verify route geometry before coordinating outage timing or crossing structures.',
    type: 'Crossing / outage coordination',
    confidence: 'Verify first',
  },
  {
    key: 'land',
    thresholdKm: 1.6,
    title: 'Shared land and access',
    range: '< 1.6 km',
    share: 'Potential right-of-way, access roads, and permits',
    descriptor:
      'Check verified routes, parcels, easements, ownership, access roads, and permit requirements before considering shared land.',
    type: 'Land / access',
    confidence: 'Potential',
  },
  {
    key: 'logistics',
    thresholdKm: 8,
    title: 'Site logistics',
    range: '< 8 km',
    share: 'Potential laydown yards, deliveries, and local mobilization',
    descriptor:
      'Compare staging areas, deliveries, site access, and contractor mobilization; point proximity does not establish a shared site.',
    type: 'Site logistics',
    confidence: 'Potential',
  },
  {
    key: 'resources',
    thresholdKm: SCREENING_DISTANCE_KM,
    title: 'Regional resources',
    range: '< 40 km',
    share: 'Potential crews, cranes, contractors, and equipment',
    descriptor:
      'Compare crew availability, cranes, contractors, and equipment moves; confirm actual travel routes, schedules, and resource availability.',
    type: 'Crews / equipment',
    confidence: 'Potential',
  },
]

export function getDistanceTier(distance) {
  if (distance >= SCREENING_DISTANCE_KM) {
    return {
      key: 'outside',
      title: 'Outside the 40 km challenge screen',
      range: '40 km or farther',
      qualifies: false,
    }
  }
  const tier = COORDINATION_DISTANCE_TIERS.find((item) => distance < item.thresholdKm)
  return { ...tier, qualifies: true }
}

export function getCoordinationOptions(opportunity) {
  const distanceOptions = COORDINATION_DISTANCE_TIERS.map((tier) => ({
    ...tier,
    applicable: opportunity.distanceKm < tier.thresholdKm,
  }))
  distanceOptions.push({
    key: 'schedule',
    title: 'Verify both project schedules',
    type: 'Schedule coordination',
    descriptor:
      opportunity.timeGapDays === null
        ? 'At least one schedule window is unavailable. Confirm current planning dates with both utilities.'
        : opportunity.timeGapDays === 0
          ? 'The supplied schedule windows overlap or touch; confirm construction and outage windows.'
          : `The supplied schedule windows are about ${opportunity.timeGapDays.toLocaleString()} days apart; check whether work sequencing can align.`,
    share: 'Compare current construction and outage windows',
    confidence: 'Confirm',
    applicable: null,
  })
  return distanceOptions
}

export function getScreeningScore(opportunity) {
  if (opportunity.distanceKm >= SCREENING_DISTANCE_KM) return 0
  const proximity = Math.max(0, 1 - opportunity.distanceKm / SCREENING_DISTANCE_KM)
  const schedule =
    opportunity.timeGapDays === null
      ? null
      : Math.max(0, 1 - opportunity.timeGapDays / 365)
  return Math.round(100 * (schedule === null ? proximity : proximity * 0.7 + schedule * 0.3))
}

export function getScreeningScoreExplanation(opportunity) {
  if (opportunity.distanceKm >= SCREENING_DISTANCE_KM) {
    return 'Not flagged: the nearest supplied points are 40 km or farther apart, outside the challenge geographic screen.'
  }
  if (opportunity.timeGapDays === null) {
    return 'Ranking heuristic: proximity only, normalized to the 40 km screen; schedule data is unavailable.'
  }
  return 'Ranking heuristic: 70% proximity within the 40 km screen and 30% schedule alignment; these weights are app-defined, not challenge-prescribed.'
}

export function formatDistanceKm(distance) {
  if (!Number.isFinite(distance)) return 'Distance unavailable'
  return `${distance < 10 ? distance.toFixed(2) : distance.toFixed(1)} km`
}

export function formatScheduleDate(project) {
  const date = project.inServiceDate || project.startDate
  if (!date) return 'Schedule date not supplied'
  if (!parseDateWindow(date)) return `Source date could not be parsed: ${date}`
  return date
}

export function formatScheduleGap(days) {
  if (days === null) return 'Schedule unavailable'
  if (days === 0) return 'Schedule windows overlap'
  return `${days.toLocaleString()} day${days === 1 ? '' : 's'} apart`
}

export function createScreeningData() {
  const projectData = [
    ...buildProjects(dominionData, 'Dominion Energy South Carolina'),
    ...buildProjects(georgiaData, 'Georgia Power').filter((project) =>
      /transmission|substation/i.test(project.projectType),
    ),
  ]
  const dominionProjects = projectData.filter(
    (project) => project.utility === 'Dominion Energy South Carolina',
  )
  const georgiaProjects = projectData.filter((project) => project.utility === 'Georgia Power')
  const candidates = []

  for (const projectA of dominionProjects) {
    for (const projectB of georgiaProjects) {
      const nearest = nearestProjectPoints(projectA, projectB)
      candidates.push({
        projectIdA: projectA.id,
        projectIdB: projectB.id,
        ...nearest,
        timeGapDays: getScheduleGap(projectA, projectB),
      })
    }
  }

  candidates.sort(
    (a, b) =>
      a.distanceKm - b.distanceKm ||
      a.projectIdA.localeCompare(b.projectIdA) ||
      a.projectIdB.localeCompare(b.projectIdB),
  )
  const overlapData = candidates.map((candidate, index) => ({
    ...candidate,
    id: `OVL_${index + 1}`,
  }))
  return { projectData, overlapData }
}
