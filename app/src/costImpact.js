const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatUsd(amount) {
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0)
}

export function formatCompactUsd(amount) {
  return compactCurrencyFormatter.format(Number.isFinite(amount) ? amount : 0)
}

export function calculateProjectCostBreakdown(opportunity) {
  const projects = [opportunity.projectA, opportunity.projectB]
  const disclosedCosts = projects
    .filter(
      (project) =>
        Number.isFinite(project.estimatedCostUsd) && project.estimatedCostUsd > 0,
    )
    .map((project) => ({
      projectId: project.id,
      projectName: project.projectName,
      utility: project.utility,
      amountUsd: project.estimatedCostUsd,
      source: project.costSource ?? 'Source citation unavailable',
      sourceUrl: project.sourceUrl ?? null,
    }))

  return {
    disclosedCosts,
    disclosedTotalUsd: disclosedCosts.reduce((total, cost) => total + cost.amountUsd, 0),
    missingCostCount: projects.length - disclosedCosts.length,
    totalProjectCount: projects.length,
    savingsUnavailableReason:
      'The supplied documents do not include shareable-resource quantities, rates, or avoided-cost amounts; coordination savings cannot be calculated defensibly.',
  }
}
