export type RiskLevel = "low" | "medium" | "high" | "unknown";

/**
 * MVP risk score: each approved incident contributes severity × 10 points,
 * capped at 100. Rejected and pending incidents contribute nothing.
 * The matching SQL lives in admin_moderate_incident so recalculation and
 * moderation remain one database transaction.
 */
export function calculateRiskScore(severities: number[]) {
  return Math.min(
    100,
    severities.reduce((total, severity) => total + severity * 10, 0),
  );
}
