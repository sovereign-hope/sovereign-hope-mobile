import { canUseLiquidGlass } from "../liquidGlassSupport";

describe("canUseLiquidGlass", () => {
  it("returns false outside iOS", () => {
    expect(
      canUseLiquidGlass("android", {
        isGlassEffectCheck: () => true,
        isLiquidGlassCheck: () => true,
      })
    ).toBe(false);
  });

  it("returns false when checks are missing", () => {
    expect(
      canUseLiquidGlass("ios", {
        isGlassEffectCheck: "not-a-function",
        isLiquidGlassCheck: () => true,
      })
    ).toBe(false);

    expect(
      canUseLiquidGlass("ios", {
        isGlassEffectCheck: () => true,
        isLiquidGlassCheck: undefined,
      })
    ).toBe(false);
  });

  it("returns true only when both iOS capability checks pass", () => {
    expect(
      canUseLiquidGlass("ios", {
        isGlassEffectCheck: () => true,
        isLiquidGlassCheck: () => true,
      })
    ).toBe(true);

    expect(
      canUseLiquidGlass("ios", {
        isGlassEffectCheck: () => true,
        isLiquidGlassCheck: () => false,
      })
    ).toBe(false);
  });
});
