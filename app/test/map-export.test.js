import assert from 'node:assert/strict'
import test from 'node:test'
import { createOpportunityCsv } from '../src/mapExport.js'

const opportunity = {
  id: 'OVL_2',
  distanceKm: 9.09,
  timeGapDays: 152,
  score: 85,
  projectA: {
    id: 'DESC_3',
    utility: 'Dominion Energy South Carolina',
    projectName: 'Jasper - Okatie, 230 kV #2',
    projectType: 'New 230 kV transmission line',
    inServiceDate: '2025-12-31',
    region: 'Jasper to Okatie corridor',
    lat: 32.346439,
    lon: -81.0785475,
    sites: [{ name: 'Jasper Substation', lat: 32.35912, lon: -81.1246 }],
  },
  projectB: {
    id: 'GPC_2',
    utility: 'Georgia Power',
    projectName: 'Savannah reactor project',
    projectType: 'Substation equipment',
    inServiceDate: '2026-06-01',
    region: 'Savannah / Purrysburg',
    lat: 32.352116,
    lon: -81.175112,
    sites: [{ name: 'McIntosh', lat: 32.352116, lon: -81.175112 }],
  },
}

test('exports both selected projects with screening and provenance caveats', () => {
  const csv = createOpportunityCsv(opportunity)
  const [header, projectA, projectB] = csv.split('\r\n')

  assert.match(header, /screening_score_not_probability/)
  assert.match(header, /reported_point_distance_km/)
  assert.match(header, /geographic_overlap_under_40_km/)
  assert.match(header, /potential_sharing_at_this_distance/)
  assert.match(header, /screening_score_explanation/)
  assert.match(header, /known_project_cost_total_usd/)
  assert.match(header, /coordination_savings_status/)
  assert.doesNotMatch(header, /illustrative|avoided_cost/)
  assert.match(header, /location_source_url/)
  assert.match(header, /coordinate_basis/)
  assert.match(projectA, /^"OVL_2","9\.09","true","Regional resources"/)
  assert.match(projectA, /Score = 70% proximity/)
  assert.match(projectB, /"Georgia Power","GPC_2"/)
  assert.match(projectA, /"Jasper - Okatie, 230 kV #2"/)
  assert.match(csv, /coordinate-level source citation is not attached/)
  assert.match(csv, /Coordinates from supplied working dataset; calculation method is not recorded/)
  assert.match(csv, /No verified route geometry supplied/)
})

test('escapes embedded quote characters in CSV fields', () => {
  const csv = createOpportunityCsv({
    ...opportunity,
    projectA: {
      ...opportunity.projectA,
      projectName: 'North "Station" rebuild',
    },
  })

  assert.match(csv, /"North ""Station"" rebuild"/)
})

test('does not export a pair at 40 km as a challenge geographic overlap', () => {
  const csv = createOpportunityCsv({
    ...opportunity,
    distanceKm: 40,
  })

  const [, projectA] = csv.split('\r\n')
  assert.match(projectA, /^"OVL_2","40","false","Outside the 40 km geographic screen"/)
})
