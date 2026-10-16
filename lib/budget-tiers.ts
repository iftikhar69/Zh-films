/** Suggested budgets for the custom wedding package. Guides only — never a price or a quote. */
export const BUDGET_TIERS = {
  standard: { label: "Standard", amount: "PKR 80,000–110,000", min: 80_000, max: 110_000 },
  medium: { label: "Medium", amount: "PKR 150,000", min: 150_000, max: 150_000 },
  premium: { label: "Premium", amount: "PKR 200,000", min: 200_000, max: 200_000 }
} as const;

export type BudgetTier = keyof typeof BUDGET_TIERS;
export const BUDGET_TIER_KEYS = Object.keys(BUDGET_TIERS) as [BudgetTier, ...BudgetTier[]];

export const budgetTierText = (tier: BudgetTier) => `Suggested budget: ${BUDGET_TIERS[tier].label} (${BUDGET_TIERS[tier].amount})`;

/** What is stored in Booking.budget: the server's wording for the tier, then anything the customer typed. */
export function composeBudget(tier: BudgetTier | undefined, note: string) {
  const extra = note.trim();
  if (!tier) return extra;
  const base = budgetTierText(tier);
  return extra ? `${base} · ${extra}`.slice(0, 300) : base;
}
