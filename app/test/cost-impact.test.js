import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateProjectCostBreakdown, formatUsd } from '../src/costImpact.js'

test('sums documented project estimates and reports unavailable coordination savings', () => {
  const breakdown = calculateProjectCostBreakdown({
    projectA: { id: 'DESC_1', projectName: 'Line rebuild', utility: 'Dominion', estimatedCostUsd: 19_280_474, costSource: 'Filing p. 12' },
    projectB: { id: 'GPC_1', projectName: 'Substation work', utility: 'Georgia Power', estimatedCostUsd: null },
  })

  assert.equal(breakdown.disclosedTotalUsd, 19_280_474)
  assert.equal(breakdown.disclosedCosts.length, 1)
  assert.equal(breakdown.missingCostCount, 1)
  assert.match(breakdown.savingsUnavailableReason, /cannot be calculated defensibly/)
  assert.equal(formatUsd(breakdown.disclosedTotalUsd), '$19,280,474')
})
