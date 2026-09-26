import { calculateProjectCostBreakdown } from './costImpact.js'
import { getDistanceTier, SCREENING_DISTANCE_KM } from './projectData.js'

function escapeCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export const locationProvenance = Object.freeze({
  sourceName: 'Not supplied',
  sourceUrl: 'Not supplied',
  featureReference: 'Not supplied',
  verificationStatus: 'Unverified; coordinate-level source citation is not attached',
  coordinateBasis: 'Coordinates from supplied working dataset; calculation method is not recorded',
  lastChecked: 'Not recorded',
})

export function createOpportunityCsv(opportunity) {
  const costBreakdown = calculateProjectCostBreakdown(opportunity)
  const distanceTier = getDistanceTier(opportunity.distanceKm)
  const rows = [
    [
      'opportunity_id',
      'reported_point_distance_km',
      'challenge_geographic_overlap_under_40_km',
      'applicable_coordination_tier',
      'planned_date_gap_days',
      'screening_rank_not_probability',
      'utility',
      'project_id',
      'project_name',
      'project_type',
      'planned_in_service_date',
      'region',
      'project_screening_latitude',
      'project_screening_longitude',
      'estimated_project_cost_usd',
      'cost_source',
      'cost_source_url',
      'named_locations',
      'location_source_name',
      'location_source_url',
      'location_feature_reference',
      'location_verification_status',
      'coordinate_basis',
      'location_last_checked',
      'route_geometry_status',
      'coordination_savings_status',
    ],
    ...[opportunity.projectA, opportunity.projectB].map((project) => [
      opportunity.id,
      opportunity.distanceKm,
      opportunity.distanceKm < SCREENING_DISTANCE_KM,
      distanceTier.title,
      opportunity.timeGapDays,
      opportunity.score,
      project.utility,
      project.id,
      project.projectName,
      project.projectType,
      project.inServiceDate,
      project.region,
      project.lat,
      project.lon,
      project.estimatedCostUsd,
      project.costSource,
      project.sourceUrl,
      project.sites.map((site) => `${site.name} (${site.lat}, ${site.lon})`).join('; '),
      locationProvenance.sourceName,
      locationProvenance.sourceUrl,
      locationProvenance.featureReference,
      locationProvenance.verificationStatus,
      locationProvenance.coordinateBasis,
      locationProvenance.lastChecked,
      'No verified route geometry supplied; lines are straight-line screening aids only',
      costBreakdown.savingsUnavailableReason,
    ]),
    [
      opportunity.id,
      opportunity.distanceKm,
      opportunity.distanceKm < SCREENING_DISTANCE_KM,
      distanceTier.title,
      opportunity.timeGapDays,
      opportunity.score,
      'Combined disclosed project estimates',
      '',
      '',
      '',
      '',
      '',
      '',
      costBreakdown.disclosedTotalUsd,
      costBreakdown.disclosedCosts.map((cost) => cost.source).join('; '),
      costBreakdown.disclosedCosts.map((cost) => cost.sourceUrl).join('; '),
      '',
      locationProvenance.sourceName,
      locationProvenance.sourceUrl,
      locationProvenance.featureReference,
      locationProvenance.verificationStatus,
      locationProvenance.coordinateBasis,
      locationProvenance.lastChecked,
      'Combined project budget estimates are not a coordination-savings estimate',
      costBreakdown.savingsUnavailableReason,
    ],
  ]

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}
