import type { RetryOptions } from './types'

export { NPM_REGISTRY } from 'fast-npm-meta'

export const DEFAULT_STRICT_SSL = true
export const NPM_CONFIG_ENV_PREFIX = 'npm_config_'

// https://github.com/antfu/fast-npm-meta/blob/main/package/src/api.ts
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 5,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: Number.POSITIVE_INFINITY,
  randomize: false,
}
