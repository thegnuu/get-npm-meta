import type { RegistryAuthConfig } from '../types'
import type { LegacyRegistryAuthConfig, RawConfig } from './types'
import { Buffer } from 'node:buffer'
import { readString } from './values'

const REGISTRY_AUTH_KEY_RE = /^(\/\/.+):(_authToken|_auth|username|_password|certfile|keyfile)$/u
const SCOPE_REGISTRY_KEY_RE = /^@[^:]+:registry$/u

export function getScopeRegistries(rawConfig: RawConfig) {
  const scopeRegistries: Record<string, string> = {}

  for (const [key, value] of Object.entries(rawConfig)) {
    if (!SCOPE_REGISTRY_KEY_RE.test(key))
      continue

    const registry = readString(value)
    if (registry)
      scopeRegistries[key.slice(0, -':registry'.length)] = normalizeRegistry(registry)
  }

  return scopeRegistries
}

export function getNpmRegistryConfigs(
  registry: string,
  scopeRegistries: Record<string, string>,
  scope?: string,
) {
  const npmConfigs: Record<string, string> = { registry }

  for (const [scopeName, scopeRegistry] of Object.entries(scopeRegistries))
    npmConfigs[`${scopeName}:registry`] = scopeRegistry

  if (scope)
    npmConfigs.scope = scope

  return npmConfigs
}

export function getRegistryAuthConfigs(rawConfig: RawConfig) {
  const groupedAuth: Record<string, LegacyRegistryAuthConfig> = {}

  for (const [key, value] of Object.entries(rawConfig)) {
    const match = key.match(REGISTRY_AUTH_KEY_RE)
    if (!match)
      continue

    const [, registryKey, authKey] = match
    const normalizedRegistryKey = normalizeRegistryKey(registryKey)
    const authGroup = groupedAuth[normalizedRegistryKey] ?? {}
    const authValue = readString(value)

    if (authValue !== undefined) {
      switch (authKey) {
        case '_auth':
          authGroup._auth = authValue
          break
        case '_authToken':
          authGroup._authToken = authValue
          break
        case 'username':
          authGroup.username = authValue
          break
        case '_password':
          authGroup._password = authValue
          break
        case 'certfile':
          authGroup.certfile = authValue
          break
        case 'keyfile':
          authGroup.keyfile = authValue
          break
      }
    }

    groupedAuth[normalizedRegistryKey] = authGroup
  }

  return Object.fromEntries(
    Object.entries(groupedAuth)
      .map(([registryKey, config]) => [registryKey, toRegistryAuthConfig(config)] satisfies [string, RegistryAuthConfig])
      .filter((entry): entry is [string, RegistryAuthConfig] => Object.keys(entry[1]).length > 0),
  )
}

export function toRegistryAuthConfig(config: LegacyRegistryAuthConfig): RegistryAuthConfig {
  const registryAuthConfig: RegistryAuthConfig = {}

  if (config._authToken) {
    registryAuthConfig.token = config._authToken
  }
  else if (config._auth) {
    registryAuthConfig.basicAuth = config._auth
  }
  else if (config.username && config._password) {
    const password = Buffer.from(config._password, 'base64').toString('utf8')
    registryAuthConfig.basicAuth = Buffer.from(`${config.username}:${password}`, 'utf8').toString('base64')
  }

  if (config.certfile)
    registryAuthConfig.certFile = config.certfile
  if (config.keyfile)
    registryAuthConfig.keyFile = config.keyfile

  return registryAuthConfig
}

export function normalizeRegistry(registry: string) {
  return registry.endsWith('/') ? registry : `${registry}/`
}

export function normalizeRegistryKey(registryKey: string) {
  return registryKey.endsWith('/') ? registryKey : `${registryKey}/`
}
