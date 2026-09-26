import { calculateProjectCostBreakdown } from './costImpact.js'
import {
  getDistanceTier,
  getScreeningScore,
  getScreeningScoreExplanation,
  SCREENING_DISTANCE_KM,
} from './projectData.js'

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
  const screeningScore = getScreeningScore(opportunity)
  const scoreExplanation = getScreeningScoreExplanation(opportunity)
  const rows = [
    [
      'opportunity_id',
      'reported_point_distance_km',
      'geographic_overlap_under_40_km',
      'distance_tier',
      'potential_sharing_at_this_distance',
      'planned_date_gap_days',
      'screening_score_not_probability',
      'screening_score_explanation',
      'utility',
      'project_id',
      'project_name',
      'project_type',
      'planned_in_service_date',
      'region',
      'project_screening_latitude',
      'project_screening_longitude',
      'named_locations',
      'location_source_name',
      'location_source_url',
      'location_feature_reference',
      'location_verification_status',
      'coordinate_basis',
      'location_last_checked',
      'route_geometry_status',
      'status',
      'description',
      'cost_estimate_usd',
      'cost_source_or_disclosure',
      'known_project_cost_total_usd',
      'project_costs_missing_count',
      'coordination_savings_status',
    ],
    ...[opportunity.projectA, opportunity.projectB].map((project) => [
      opportunity.id,
      opportunity.distanceKm,
      opportunity.distanceKm < SCREENING_DISTANCE_KM,
      distanceTier.title,
      distanceTier.share,
      opportunity.timeGapDays,
      screeningScore,
      scoreExplanation,
      project.utility,
      project.id,
      project.projectName,
      project.projectType,
      project.inServiceDate,
      project.region,
      project.lat,
      project.lon,
      project.sites.map((site) => `${site.name} (${site.lat}, ${site.lon})`).join('; '),
      locationProvenance.sourceName,
      locationProvenance.sourceUrl,
      locationProvenance.featureReference,
      locationProvenance.verificationStatus,
      locationProvenance.coordinateBasis,
      locationProvenance.lastChecked,
      'No verified route geometry supplied; lines are straight-line screening aids only',
      project.status,
      project.description,
      project.estimatedCostUsd ?? '',
      project.costSource ?? project.costDisclosure,
      costBreakdown.disclosedTotalUsd,
      costBreakdown.missingCostCount,
      costBreakdown.savingsUnavailableReason,
    ]),
  ]

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}
