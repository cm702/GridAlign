import dominionData from '../../new_data/processed/dominion_energy_south_carolina.json' with { type: 'json' }
import georgiaData from '../../new_data/processed/georgia_power.json' with { type: 'json' }

export const SCREENING_DISTANCE_KM = 40
const KM_TO_EARTH_RADIUS = 1 / 6371.0088

export function formatDescriptionKm(description) {
  return description.replace(
    /(\d+(?:\.\d+)?)\s*(?:miles?|mi\.?)(?![a-z])/gi,
    (_, miles) => `${(Number(miles) * 1.60934).toFixed(1)} km`,
  )
}

export const COORDINATION_DISTANCE_TIERS = [
  {
    key: 'crossing',
    thresholdKm: 0.1,
    range: '< 0.1 km · verify crossing',
    title: 'Near-coincident points',
    share: 'If routes touch/cross: outage timing and crossing structures',
    descriptor: 'Compare verified route maps. Near-coincident points do not prove a line crossing; coordinate crossing structures and outage timing only if routes intersect.',
  },
  {
    key: 'land',
    thresholdKm: 1.6,
    range: '< 1.6 km',
    title: 'Shared land and access',
    share: 'Potential right-of-way, access roads, and permits',
    descriptor: 'Check verified routes, parcel boundaries, easements, ownership, access roads, and permit requirements before considering shared land.',
  },
  {
    key: 'logistics',
    thresholdKm: 8,
    range: '< 8 km',
    title: 'Site logistics',
    share: 'Potential laydown yards, deliveries, and local mobilization',
    descriptor: 'Compare staging areas, deliveries, site access, and contractor mobilization; point proximity does not establish a shared site.',
  },
  {
    key: 'resources',
    thresholdKm: SCREENING_DISTANCE_KM,
    range: '< 40 km',
    title: 'Regional resources',
    share: 'Potential crews, cranes, contractors, and equipment',
    descriptor: 'Compare crew availability, cranes, contractors, and equipment moves; confirm actual travel routes, schedules, and resource availability.',
  },
]

export function parseDateWindow(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const normalized = value.trim()
  const quarter = normalized.match(/^Q([1-4])\s+(\d{4})$/i)
  const year = normalized.match(/^(\d{4})$/)

  if (quarter) {
    const startMonth = (Number(quarter[1]) - 1) * 3
    const start = new Date(Date.UTC(Number(quarter[2]), startMonth, 1))
    const end = new Date(Date.UTC(Number(quarter[2]), startMonth + 3, 0))
    return { start, end, precision: 'quarter' }
  }

  if (year) {
    const start = new Date(Date.UTC(Number(year[1]), 0, 1))
    const end = new Date(Date.UTC(Number(year[1]), 11, 31))
    return { start, end, precision: 'year' }
  }

  const shortDate = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  const isoDate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parts = isoDate
    ? { year: Number(isoDate[1]), month: Number(isoDate[2]), day: Number(isoDate[3]) }
    : shortDate
      ? {
          year: Number(shortDate[3]) < 100 ? 2000 + Number(shortDate[3]) : Number(shortDate[3]),
          month: Number(shortDate[1]),
          day: Number(shortDate[2]),
        }
      : null

  if (!parts) return null
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day
  ) {
    return null
  }
  return { start: date, end: date, precision: 'day' }
}

function cleanCoordinates(project) {
  return (project.coordinates ?? [])
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        point.latitude >= -90 &&
        point.latitude <= 90 &&
        point.longitude >= -180 &&
        point.longitude <= 180,
    )
    .map((point) => ({ lat: point.latitude, lon: point.longitude }))
}

function parseUsd(value) {
  if (typeof value !== 'string') return null
  const numericValue = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null
}

function sourceCitation(project) {
  const source = project.sources?.[0]
  if (!source) return null
  const title =
    source.file_name === '2026-2030-2million-and-above-project-descriptions.pdf'
      ? 'Dominion Energy 2026–2030 project descriptions'
      : source.file_name
          .replace(/\.pdf$/i, '')
          .replaceAll('-', ' ')
          .replaceAll('_', ' ')
  const page = Number.isInteger(source.page) ? `, p. ${source.page}` : ''
  return `${title}${page}`
}

function projectFromRecord(record, utility, index) {
  const coordinates = cleanCoordinates(record)
  if (!coordinates.length) return null

  const [representativePoint] = coordinates
  const dateWindow = parseDateWindow(record.end_date)
  const source = sourceCitation(record)

  return {
    id: `${utility === 'Georgia Power' ? 'GPC' : 'DESC'}_${String(index + 1).padStart(3, '0')}`,
    utility,
    state: record.state === 'Georgia' ? 'GA' : record.state,
    projectName: record.project_name,
    aliases: record.aliases ?? [],
    projectType: record.project_type ?? 'Project type not supplied',
    description: record.description ?? '',
    status: record.status ?? 'Not supplied',
    lat: representativePoint.lat,
    lon: representativePoint.lon,
    sites: coordinates.map((point, pointIndex) => ({
      name: coordinates.length === 1
        ? record.location || 'Project location'
        : `Listed coordinate ${pointIndex + 1}`,
      ...point,
    })),
    inServiceDate: record.end_date ?? 'Not supplied',
    datePrecision: dateWindow?.precision ?? null,
    dateWindow,
    region: [record.location, record.county, record.state]
      .filter(Boolean)
      .join(' · '),
    estimatedCostUsd: parseUsd(record.estimated_cost),
    costSource: parseUsd(record.estimated_cost) === null ? null : source,
    costDisclosure: record.estimated_cost ? null : 'No public project-level cost supplied',
    sourceCitation: source,
    sourceReference: source
      ? `${source}${utility === 'Dominion Energy South Carolina' ? ' · SCRTP 2026–2030 filing' : ''}`
      : 'Source reference not supplied',
    sourceUrl:
      utility === 'Dominion Energy South Carolina'
        ? 'https://www.scrtp.com/assets/pdfs/home/2026-2030-2million-and-above-project-descriptions.pdf'
        : 'https://www.georgiapower.com/about/grid-reliability/grid-improvements/grid-projects/transmission-projects.html',
  }
}

function isTransmissionProject(project) {
  return /transmission|substation/i.test(project.project_type ?? '')
}

function centralAngle(a, b) {
  const radians = (degrees) => degrees * Math.PI / 180
  const lat1 = radians(a.lat)
  const lat2 = radians(b.lat)
  const latDelta = lat2 - lat1
  const lonDelta = radians(b.lon - a.lon)
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2
  return 2 * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

function nearestListedPointPair(projectA, projectB) {
  let nearest = null
  for (const pointA of projectA.sites) {
    for (const pointB of projectB.sites) {
      const distanceKm = centralAngle(pointA, pointB) / KM_TO_EARTH_RADIUS
      if (nearest === null || distanceKm < nearest.distanceKm) {
        nearest = { distanceKm, pointA, pointB }
      }
    }
  }
  return nearest
}

function dateGapDays(projectA, projectB) {
  if (!projectA.dateWindow || !projectB.dateWindow) return null
  const dayMs = 86_400_000
  if (projectA.dateWindow.end < projectB.dateWindow.start) {
    return Math.round((projectB.dateWindow.start - projectA.dateWindow.end) / dayMs)
  }
  if (projectB.dateWindow.end < projectA.dateWindow.start) {
    return Math.round((projectA.dateWindow.start - projectB.dateWindow.end) / dayMs)
  }
  return 0
}

export function createScreeningData() {
  const dominionProjects = dominionData.projects
    .map((project, index) => projectFromRecord(project, dominionData.company_name, index))
    .filter(Boolean)
  const georgiaProjects = georgiaData.projects
    .filter(isTransmissionProject)
    .map((project, index) => projectFromRecord(project, georgiaData.company_name, index))
    .filter(Boolean)
  const projectData = [...dominionProjects, ...georgiaProjects]
  const overlapData = []

  for (const georgiaProject of georgiaProjects) {
    for (const dominionProject of dominionProjects) {
      const nearestPoints = nearestListedPointPair(georgiaProject, dominionProject)
      if (!nearestPoints) continue
      const timeGap = dateGapDays(georgiaProject, dominionProject)
      overlapData.push({
        distanceKm: nearestPoints.distanceKm,
        nearestPointA: nearestPoints.pointA,
        nearestPointB: nearestPoints.pointB,
        timeGapDays: timeGap,
        id: '',
        utilityA: georgiaProject.utility,
        projectIdA: georgiaProject.id,
        projectNameA: georgiaProject.projectName,
        utilityB: dominionProject.utility,
        projectIdB: dominionProject.id,
        projectNameB: dominionProject.projectName,
      })
    }
  }

  overlapData.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm
    if (a.timeGapDays === null) return 1
    if (b.timeGapDays === null) return -1
    return a.timeGapDays - b.timeGapDays
  })
  overlapData.forEach((opportunity, index) => {
    opportunity.id = `OVL_${index + 1}`
  })

  const maxDistanceKm = Math.ceil(overlapData.at(-1)?.distanceKm ?? 0)
  return { projectData, overlapData, maxDistanceKm }
}

export function formatDistanceKm(distanceKm) {
  return `${distanceKm.toFixed(distanceKm < 10 ? 2 : 1)} km`
}

export function formatScheduleGap(days) {
  if (days === null) return 'Schedule window not available for both projects'
  return days === 0 ? 'Schedule windows overlap' : `${days.toLocaleString()} day gap`
}

export function formatScheduleDate(project) {
  if (!project.dateWindow) {
    return project.inServiceDate === 'Not supplied'
      ? 'Schedule not supplied'
      : `Source date could not be parsed: ${project.inServiceDate}`
  }
  const { precision, start } = project.dateWindow
  if (precision === 'year') return `Sometime in ${start.getUTCFullYear()}`
  if (precision === 'quarter') {
    const quarter = Math.floor(start.getUTCMonth() / 3) + 1
    return `During Q${quarter} ${start.getUTCFullYear()}`
  }
  return project.inServiceDate
}

export function getDistanceTier(distanceKm) {
  const applicableTiers = COORDINATION_DISTANCE_TIERS.filter(
    (tier) => distanceKm < tier.thresholdKm,
  )
  if (applicableTiers.length) return { ...applicableTiers[0], qualifies: true }
  if (distanceKm < SCREENING_DISTANCE_KM) {
    return { ...COORDINATION_DISTANCE_TIERS.at(-1), qualifies: true }
  }
  return {
    title: 'Outside the 40 km geographic screen',
    range: '40 km or farther',
    share: 'No geographic sharing opportunity is flagged by the challenge rule',
    descriptor: 'This pair remains visible for comparison, but the challenge says to ignore pairs at or beyond 40 km. Nearby shared crews or equipment are not flagged by this screen.',
    qualifies: false,
  }
}

export function getScreeningScore(opportunity) {
  if (opportunity.distanceKm >= SCREENING_DISTANCE_KM) return 0
  const proximityScore = (1 - opportunity.distanceKm / SCREENING_DISTANCE_KM) * 100
  if (opportunity.timeGapDays === null) return Math.round(proximityScore)
  const scheduleScore = Math.max(0, 100 * (1 - opportunity.timeGapDays / 1_096))
  return Math.round(proximityScore * 0.7 + scheduleScore * 0.3)
}

export function getScreeningScoreExplanation(opportunity) {
  if (opportunity.distanceKm >= SCREENING_DISTANCE_KM) {
    return 'Not flagged: the pair is 40 km or farther apart, beyond the challenge geographic-overlap limit.'
  }
  const proximityScore = Math.round(
    (1 - opportunity.distanceKm / SCREENING_DISTANCE_KM) * 100,
  )
  if (opportunity.timeGapDays === null) {
    return `Distance-only score: ${proximityScore}/100 because schedule windows are unavailable. Closer pairs rank higher within the 40 km screen.`
  }
  const scheduleScore = Math.round(
    Math.max(0, 100 * (1 - opportunity.timeGapDays / 1_096)),
  )
  return `Score = 70% proximity (${proximityScore}/100) + 30% schedule (${scheduleScore}/100). Proximity is measured against the 40 km limit; schedule alignment declines with the gap and reaches zero at 1,096 days.`
}

export function getCoordinationOptions(opportunity) {
  const geographyIdeas = COORDINATION_DISTANCE_TIERS.map((tier) => ({
    title: tier.title,
    descriptor: tier.descriptor,
    type: tier.range,
    confidence:
      opportunity.distanceKm < tier.thresholdKm
        ? 'Within this distance tier · verify before coordinating'
        : opportunity.distanceKm < SCREENING_DISTANCE_KM &&
            tier.thresholdKm === SCREENING_DISTANCE_KM
          ? 'Within the challenge screening radius'
          : 'Not indicated at this pair distance',
    applicable: opportunity.distanceKm < tier.thresholdKm,
    key: tier.key,
    share: tier.share,
  }))
  if (opportunity.distanceKm >= SCREENING_DISTANCE_KM) {
    geographyIdeas.push({
      title: 'Outside the challenge geographic screen',
      descriptor: 'At 40 km or farther, this pair does not qualify as a geographic overlap under the challenge rule.',
      type: '≥ 40 km',
      confidence: 'Not flagged',
      applicable: false,
      key: 'outside',
      share: 'No nearby shared-resource opportunity is flagged',
    })
  }
  const scheduleIdea = opportunity.timeGapDays === null
    ? {
        title: 'Verify both project schedules',
        descriptor: 'At least one source has no usable completion window. Confirm current planning dates and outage windows with the utilities before assessing schedule coordination.',
        type: 'Schedule verification',
        confidence: 'Dates incomplete',
      }
    : {
        title: 'Compare outage and commissioning windows',
        descriptor: opportunity.timeGapDays === 0
          ? 'The supplied schedule windows overlap or touch. Verify current dates, outages, switching plans, and commissioning dependencies with both utilities.'
          : `The supplied schedule windows are ${opportunity.timeGapDays.toLocaleString()} days apart. Check whether outage planning, mobilization, or commissioning dependencies can still align.`,
        type: 'Operations coordination',
        confidence: opportunity.timeGapDays === 0 ? 'Overlapping source windows' : 'Confirm current schedules',
      }

  return [...geographyIdeas, scheduleIdea]
}
