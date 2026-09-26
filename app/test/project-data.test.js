import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COORDINATION_DISTANCE_TIERS,
  createScreeningData,
  formatDistanceKm,
  formatDescriptionKm,
  formatScheduleGap,
  getCoordinationOptions,
  getDistanceTier,
  getScreeningScore,
  getScreeningScoreExplanation,
  formatScheduleDate,
  parseDateWindow,
} from '../src/projectData.js'

const { projectData, overlapData, maxDistanceKm } = createScreeningData()

test('uses normalized project catalogs and excludes non-transmission Georgia records', () => {
  const dominion = projectData.filter((project) => project.utility === 'Dominion Energy South Carolina')
  const georgia = projectData.filter((project) => project.utility === 'Georgia Power')

  assert.equal(dominion.length, 54)
  assert.equal(georgia.length, 11)
  assert.ok(georgia.every((project) => /transmission|substation/i.test(project.projectType)))
  assert.ok(projectData.every((project) => project.sites.length > 0))
  assert.equal(
    projectData.find((project) => project.projectName.includes('Jasper – Okatie 230 kV #2')).estimatedCostUsd,
    19_280_474,
  )
})

test('derives every coordinate-bearing cross-utility project pair and ranks by distance', () => {
  assert.equal(overlapData.length, 594)
  assert.ok(overlapData.every((match, index) => index === 0 || overlapData[index - 1].distanceKm <= match.distanceKm))
  assert.equal(overlapData.filter((match) => match.distanceKm < 40).length, 10)
  assert.equal(maxDistanceKm, Math.ceil(overlapData.at(-1).distanceKm))
  assert.ok(maxDistanceKm > 40)
  assert.ok(overlapData.every((match) => match.nearestPointA && match.nearestPointB))

  const callawayMatch = overlapData.find(
    (match) =>
      match.projectNameA === 'Callaway Road - Thomson Primary 500 kV' &&
      match.projectNameB === 'Hooks - Modoc 115/46 kV Rebuild',
  )
  assert.ok(callawayMatch)
  assert.equal(callawayMatch.distanceKm.toFixed(2), '20.05')
})

test('formats geographic distances only in kilometers', () => {
  assert.equal(formatDistanceKm(0.06), '0.06 km')
  assert.equal(formatDistanceKm(1.6), '1.60 km')
  assert.equal(formatDistanceKm(20.05), '20.1 km')
})

test('converts imperial distance expressions in descriptions for display', () => {
  assert.equal(formatDescriptionKm('Approx 18 Miles; 1.4 miles away'), 'Approx 29.0 km; 2.3 km away')
  assert.equal(formatDescriptionKm('0.5 mi. segment'), '0.8 km segment')
})

test('describes overlapping schedule windows rather than calling them a zero-day gap', () => {
  assert.equal(formatScheduleGap(0), 'Schedule windows overlap')
})

test('applies challenge coordination tiers at their stated kilometer limits', () => {
  assert.equal(getDistanceTier(0.05).key, 'crossing')
  assert.equal(getDistanceTier(0.1).key, 'land')
  assert.equal(getDistanceTier(1.6).key, 'logistics')
  assert.equal(getDistanceTier(8).key, 'resources')
  assert.equal(getDistanceTier(39.99).key, 'resources')
  assert.equal(getDistanceTier(40).qualifies, false)

  const options = getCoordinationOptions({ distanceKm: 1, timeGapDays: null })
  assert.equal(options.filter((option) => option.applicable).length, 3)
  assert.equal(options.find((option) => option.key === 'resources').applicable, true)
  assert.equal(options.at(-1).title, 'Verify both project schedules')
  assert.equal(COORDINATION_DISTANCE_TIERS.length, 4)
})

test('explains ranking inputs and never marks 40 km or farther as a geographic overlap', () => {
  const closePair = { distanceKm: 20, timeGapDays: 0 }
  assert.equal(getScreeningScore(closePair), 65)
  assert.match(getScreeningScoreExplanation(closePair), /70% proximity .*30% schedule/)
  assert.equal(getScreeningScore({ distanceKm: 20, timeGapDays: null }), 50)

  const outsidePair = { distanceKm: 40, timeGapDays: 0 }
  assert.equal(getScreeningScore(outsidePair), 0)
  assert.match(getScreeningScoreExplanation(outsidePair), /Not flagged/)
})

test('parses exact and approximate source schedule windows without repairing invalid dates', () => {
  assert.equal(parseDateWindow('Q2 2028').precision, 'quarter')
  assert.equal(parseDateWindow('2031').precision, 'year')
  assert.equal(parseDateWindow('12/01/26').start.toISOString(), '2026-12-01T00:00:00.000Z')
  assert.equal(parseDateWindow('04/31/26'), null)

  const project = projectData.find((item) => item.inServiceDate === '04/31/26')
  assert.equal(formatScheduleDate(project), 'Source date could not be parsed: 04/31/26')
})
