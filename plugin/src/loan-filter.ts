/** Mirrors database/scripts/verify_funding_corpus.py loan-like heuristic. */

const LOANLIKE_REGEX =
  /\bloan\b|loan[- ]guarantee|low[- ]cost financing|low interest rate|(?<!non-)repayable contribution|(?<!non-)repayable royalty|(?<!non-)repayable tax deferral/giu;

export function textLooksLoanBacked(textParts: readonly string[]): boolean {
  const blob = textParts.filter(Boolean).join(" ");
  return LOANLIKE_REGEX.test(blob);
}
