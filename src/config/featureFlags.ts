/**
 * Safety-sensitive features remain opt-in at build time and off by default.
 * They must not be inferred from the presence of prototype routes or services.
 */
export const FEATURE_FLAGS = Object.freeze({
  chantCoachEnabled: false,
  communityEnabled: false,
} as const)

export type FeatureFlagName = keyof typeof FEATURE_FLAGS
