/**
 * Safety-sensitive features remain opt-in at build time. They must not be
 * inferred from the presence of prototype routes or services.
 *
 * `chantCoachEnabled` compiles the on-device Chant Coach in, but does NOT by
 * itself expose analysis to a child: the runtime additionally requires the
 * parent-gated preference to be switched on, and the analyzer reports itself
 * unavailable whenever the locally-provisioned model assets are absent
 * (recordings then receive participation-only encouragement, as before).
 * The release stage below is shown wherever coach output is rendered:
 * per docs/CHANT_COACH_VALIDATION_PLAN.md this build is in the
 * internal/adult-testing stages, and its thresholds are not yet
 * educator-validated.
 */
export const FEATURE_FLAGS = Object.freeze({
  chantCoachEnabled: true,
  communityEnabled: false,
} as const)

/** Staged-release position per docs/CHANT_COACH_VALIDATION_PLAN.md §8. */
export const CHANT_COACH_RELEASE_STAGE = 'internal-testing' as const

export type FeatureFlagName = keyof typeof FEATURE_FLAGS
