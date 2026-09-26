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
  const rows = [
    [
      'opportunity_id',
      'reported_point_distance_mi',
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
      'named_locations',
      'location_source_name',
      'location_source_url',
      'location_feature_reference',
      'location_verification_status',
      'coordinate_basis',
      'location_last_checked',
      'route_geometry_status',
    ],
    ...[opportunity.projectA, opportunity.projectB].map((project) => [
      opportunity.id,
      opportunity.distanceMi,
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
      project.sites.map((site) => `${site.name} (${site.lat}, ${site.lon})`).join('; '),
      locationProvenance.sourceName,
      locationProvenance.sourceUrl,
      locationProvenance.featureReference,
      locationProvenance.verificationStatus,
      locationProvenance.coordinateBasis,
      locationProvenance.lastChecked,
      'No verified route geometry supplied; lines are straight-line screening aids only',
    ]),
  ]

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}
