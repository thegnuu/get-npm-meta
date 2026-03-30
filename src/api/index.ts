import type {
  GetLatestVersionOptions,
  GetVersionsOptions,
  InferGetLatestVersionResult,
  InferGetVersionsResult,
  NpmConfigOptions,
} from '../types'
import {
  getLatestVersion as getFastLatestVersion,
  getLatestVersionBatch as getFastLatestVersionBatch,
  getVersions as getFastVersions,
  getVersionsBatch as getFastVersionsBatch,
} from 'fast-npm-meta'
import { isDefaultRegistry, resolvePackageContexts } from './context'
import { getLatestVersionFromRegistry, getVersionsFromRegistry } from './direct'

export async function getLatestVersion<Metadata extends boolean = false, Throw extends boolean = true>(
  spec: string,
  options: GetLatestVersionOptions<Metadata, Throw> = {},
): Promise<InferGetLatestVersionResult<Metadata, Throw>> {
  const [context] = resolvePackageContexts([spec], options)

  return getLatestVersionForContext(context, options)
}

export async function getLatestVersionBatch<Metadata extends boolean = false, Throw extends boolean = true>(
  specs: string[],
  options: GetLatestVersionOptions<Metadata, Throw> = {},
): Promise<InferGetLatestVersionResult<Metadata, Throw>[]> {
  const contexts = resolvePackageContexts(specs, options)

  if (contexts.every(context => isDefaultRegistry(context.registry))) {
    return getFastLatestVersionBatch(
      contexts.map(context => context.parsed.raw),
      toFastOptions(options),
    ) as Promise<InferGetLatestVersionResult<Metadata, Throw>[]>
  }

  return Promise.all(contexts.map(context => getLatestVersionForContext(context, options)))
}

export async function getVersions<Metadata extends boolean = false, Throw extends boolean = true>(
  spec: string,
  options: GetVersionsOptions<Metadata, Throw> = {},
): Promise<InferGetVersionsResult<Metadata, Throw>> {
  const [context] = resolvePackageContexts([spec], options)

  return getVersionsForContext(context, options)
}

export async function getVersionsBatch<Metadata extends boolean = false, Throw extends boolean = true>(
  specs: string[],
  options: GetVersionsOptions<Metadata, Throw> = {},
): Promise<InferGetVersionsResult<Metadata, Throw>[]> {
  const contexts = resolvePackageContexts(specs, options)

  if (contexts.every(context => isDefaultRegistry(context.registry))) {
    return getFastVersionsBatch(
      contexts.map(context => context.parsed.raw),
      toFastOptions(options),
    ) as Promise<InferGetVersionsResult<Metadata, Throw>[]>
  }

  return Promise.all(contexts.map(context => getVersionsForContext(context, options)))
}

function getLatestVersionForContext<Metadata extends boolean, Throw extends boolean>(
  context: ReturnType<typeof resolvePackageContexts>[number],
  options: GetLatestVersionOptions<Metadata, Throw>,
) {
  if (isDefaultRegistry(context.registry))
    return getFastLatestVersion(context.parsed.raw, toFastOptions(options)) as Promise<InferGetLatestVersionResult<Metadata, Throw>>

  return getLatestVersionFromRegistry(context, options)
}

function getVersionsForContext<Metadata extends boolean, Throw extends boolean>(
  context: ReturnType<typeof resolvePackageContexts>[number],
  options: GetVersionsOptions<Metadata, Throw>,
) {
  if (isDefaultRegistry(context.registry))
    return getFastVersions(context.parsed.raw, toFastOptions(options)) as Promise<InferGetVersionsResult<Metadata, Throw>>

  return getVersionsFromRegistry(context, options)
}

function toFastOptions<T extends NpmConfigOptions>(options: T): Omit<T, keyof NpmConfigOptions> {
  const {
    cwd: _cwd,
    env: _env,
    userConfigPath: _userConfigPath,
    projectConfigPath: _projectConfigPath,
    ...fastOptions
  } = options

  return fastOptions
}
