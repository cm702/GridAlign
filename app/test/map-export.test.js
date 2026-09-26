import assert from 'node:assert/strict'
import test from 'node:test'
import { createOpportunityCsv } from '../src/mapExport.js'

const opportunity = {
  id: 'OVL_2',
  distanceKm: 5.65,
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
    estimatedCostUsd: 19_280_474,
    costSource: 'Filing p. 12 · project estimate',
    sourceUrl: 'https://example.com/source.pdf',
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
    estimatedCostUsd: null,
    costSource: null,
    sourceUrl: 'https://example.com/georgia',
    sites: [{ name: 'McIntosh', lat: 32.352116, lon: -81.175112 }],
  },
}

test('exports both selected projects with screening and provenance caveats', () => {
  const csv = createOpportunityCsv(opportunity)
  const [header, projectA, projectB] = csv.split('\r\n')

  assert.match(header, /screening_rank_not_probability/)
  assert.match(header, /reported_point_distance_km/)
  assert.match(header, /coordination_savings_status/)
  assert.match(header, /location_source_url/)
  assert.match(header, /coordinate_basis/)
  assert.match(projectA, /^"OVL_2","5\.65","true","Site logistics","152","85","Dominion Energy South Carolina","DESC_3"/)
  assert.match(projectB, /"Georgia Power","GPC_2"/)
  assert.match(projectA, /"Jasper - Okatie, 230 kV #2"/)
  assert.match(projectA, /"19280474"/)
  assert.match(csv, /"Combined disclosed project estimates"/)
  assert.doesNotMatch(header, /_mi(?:,|")/)
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
