export const DATA_DIR_ENV = "SEMANTICS_DATA_DIR";
export const LEGACY_DATA_DIR_ENV = "ARCHMAX_DATA_DIR";

export interface DataDirResolution {
  dataDir: string | undefined;
  deprecationWarning?: string;
}

/**
 * Picks the configured data directory, honouring the pre-rename
 * `ARCHMAX_DATA_DIR` as a deprecated alias so existing deployments keep
 * working without changes. Returns `undefined` when neither is set so the
 * caller can apply its own default.
 */
export function resolveDataDirEnv(
  env: Record<string, string | undefined>,
): DataDirResolution {
  const current = env[DATA_DIR_ENV];
  const legacy = env[LEGACY_DATA_DIR_ENV];

  if (legacy === undefined) {
    return { dataDir: current };
  }

  const deprecationWarning =
    current === undefined
      ? `${LEGACY_DATA_DIR_ENV} is deprecated and will be removed in a future release. Rename it to ${DATA_DIR_ENV}.`
      : current === legacy
        ? `${LEGACY_DATA_DIR_ENV} is deprecated and redundant (${DATA_DIR_ENV} has the same value). Remove ${LEGACY_DATA_DIR_ENV} from your environment.`
        : `${LEGACY_DATA_DIR_ENV} is deprecated and ignored because ${DATA_DIR_ENV} is set to a different value. Remove ${LEGACY_DATA_DIR_ENV} from your environment.`;

  return { dataDir: current ?? legacy, deprecationWarning };
}
