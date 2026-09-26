import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateProjectCostBreakdown,
  formatCompactUsd,
  formatUsd,
} from '../src/costImpact.js'

test('sums only documented project costs and reports missing estimates', () => {
  const breakdown = calculateProjectCostBreakdown(
    {
      projectA: {
        id: 'DESC_1',
        utility: 'Dominion Energy South Carolina',
        projectName: 'Line rebuild',
        estimatedCostUsd: 19_280_474,
        costSource: 'Filing p. 12',
      },
      projectB: {
        id: 'GPC_1',
        utility: 'Georgia Power',
        projectName: 'Substation equipment',
        estimatedCostUsd: null,
      },
    },
  )

  assert.equal(breakdown.disclosedTotalUsd, 19_280_474)
  assert.equal(breakdown.missingCostCount, 1)
  assert.deepEqual(breakdown.disclosedCosts, [
    {
      projectId: 'DESC_1',
      projectName: 'Line rebuild',
      utility: 'Dominion Energy South Carolina',
      amountUsd: 19_280_474,
      source: 'Filing p. 12',
      sourceUrl: null,
    },
  ])
  assert.match(breakdown.savingsUnavailableReason, /cannot be calculated defensibly/)
})

test('formats currency for project detail and map summary', () => {
  assert.equal(formatUsd(1_250_000), '$1,250,000')
  assert.equal(formatCompactUsd(1_250_000), '$1.3M')
})
