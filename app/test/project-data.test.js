import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createScreeningData,
  formatDescriptionKm,
  formatDistanceKm,
  getDistanceTier,
  getScreeningScore,
} from '../src/projectData.js'

test('creates all eligible cross-utility pairs and applies the strict 40 km rule', () => {
  const { projectData, overlapData } = createScreeningData()

  assert.equal(projectData.filter((project) => project.utility === 'Dominion Energy South Carolina').length, 54)
  assert.equal(projectData.filter((project) => project.utility === 'Georgia Power').length, 11)
  assert.equal(overlapData.length, 594)
  assert.equal(overlapData.filter((pair) => pair.distanceKm < 40).length, 10)
  assert.ok(overlapData.every((pair) => pair.nearestPointA && pair.nearestPointB))
  assert.equal(getDistanceTier(40).qualifies, false)
})

test('uses kilometers for display and keeps score labeled as a ranking heuristic', () => {
  assert.equal(formatDistanceKm(1.6), '1.60 km')
  assert.equal(formatDescriptionKm('About 18 miles away'), 'About 29.0 km away')
  assert.equal(getScreeningScore({ distanceKm: 20, timeGapDays: 0 }), 65)
  assert.equal(getScreeningScore({ distanceKm: 20, timeGapDays: null }), 50)
})
