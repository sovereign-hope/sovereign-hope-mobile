type AvailabilityCheck = () => boolean;

const asAvailabilityCheck = (value: unknown): AvailabilityCheck | undefined => {
  return typeof value === "function"
    ? (value as AvailabilityCheck)
    : undefined;
};

export const canUseLiquidGlass = (
  platform: string,
  checks: {
    isGlassEffectCheck?: unknown;
    isLiquidGlassCheck?: unknown;
  }
): boolean => {
  if (platform !== "ios") {
    return false;
  }

  const isGlassEffectCheck = asAvailabilityCheck(checks.isGlassEffectCheck);
  const isLiquidGlassCheck = asAvailabilityCheck(checks.isLiquidGlassCheck);

  return Boolean(isGlassEffectCheck?.() && isLiquidGlassCheck?.());
};
