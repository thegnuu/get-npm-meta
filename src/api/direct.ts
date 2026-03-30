import type {
  GetLatestVersionOptions,
  GetVersionsOptions,
  InferGetLatestVersionResult,
  InferGetVersionsResult,
  PackageError,
  PackageVersionMeta,
  PackageVersionsInfo,
  PackageVersionsInfoWithMetadata,
  ResolvedPackageVersion,
  ResolvedPackageVersionWithMetadata,
} from '../types'
import type { PackageContext } from './context'
import { maxSatisfying, satisfies, validRange } from 'semver-es'

interface NpmPackument {
  'dist-tags'?: Record<string, string>
  'name'?: string
  'time'?: Record<string, string>
  'versions'?: Record<string, NpmPackumentVersion>
}

interface NpmPackumentVersion {
  deprecated?: string
  dist?: {
    integrity?: string
    provenance?: 'trustedPublisher' | boolean
  }
  engines?: Partial<Record<string, string>>
  integrity?: string
  provenance?: 'trustedPublisher' | boolean
}

export async function getLatestVersionFromRegistry<Metadata extends boolean = false, Throw extends boolean = true>(
  context: PackageContext,
  options: GetLatestVersionOptions<Metadata, Throw> = {},
): Promise<InferGetLatestVersionResult<Metadata, Throw>> {
  const packument = await fetchPackument(context, options)
  if (isPackageError(packument))
    return packument as InferGetLatestVersionResult<Metadata, Throw>

  const versions = packument.versions ?? {}
  const distTags = toDistTags(packument['dist-tags'])
  const time = packument.time ?? {}
  const availableVersions = Object.keys(versions)
  const specifier = context.parsed.rawSpec || 'latest'
  const lastSynced = Date.now()

  const version = resolveLatestVersion(availableVersions, versions, distTags, specifier)
  const result: ResolvedPackageVersion = {
    name: packument.name ?? context.parsed.name,
    version,
    specifier,
    publishedAt: version ? (time[version] ?? null) : null,
    lastSynced,
  }

  if (!options.metadata || !version || !versions[version])
    return result as InferGetLatestVersionResult<Metadata, Throw>

  return {
    ...result,
    ...toPackageVersionMeta(versions[version], time[version]),
  } satisfies ResolvedPackageVersionWithMetadata as InferGetLatestVersionResult<Metadata, Throw>
}

export async function getVersionsFromRegistry<Metadata extends boolean = false, Throw extends boolean = true>(
  context: PackageContext,
  options: GetVersionsOptions<Metadata, Throw> = {},
): Promise<InferGetVersionsResult<Metadata, Throw>> {
  const packument = await fetchPackument(context, options)
  if (isPackageError(packument))
    return packument as InferGetVersionsResult<Metadata, Throw>

  const versions = packument.versions ?? {}
  const distTags = toDistTags(packument['dist-tags'])
  const time = packument.time ?? {}
  const specifier = context.parsed.rawSpec || '*'
  const lastSynced = Date.now()
  const selectedVersions = filterVersionsBySpecifier(Object.keys(versions), versions, distTags, specifier, options.loose)
  const filteredVersions = filterVersionsByDate(selectedVersions, time, options.after)

  if (options.metadata) {
    const result: PackageVersionsInfoWithMetadata = {
      name: packument.name ?? context.parsed.name,
      distTags,
      lastSynced,
      specifier,
      timeCreated: time.created ?? '',
      timeModified: time.modified ?? '',
      versionsMeta: Object.fromEntries(
        filteredVersions
          .filter(version => Boolean(versions[version]))
          .map(version => [version, toPackageVersionMeta(versions[version], time[version])] satisfies [string, PackageVersionMeta]),
      ),
    }

    return result as InferGetVersionsResult<Metadata, Throw>
  }

  const result: PackageVersionsInfo = {
    name: packument.name ?? context.parsed.name,
    distTags,
    lastSynced,
    specifier,
    versions: filteredVersions,
    time: {
      created: time.created ?? '',
      modified: time.modified ?? '',
      ...Object.fromEntries(
        filteredVersions
          .filter(version => Boolean(time[version]))
          .map(version => [version, time[version]!]),
      ),
    },
  }

  return result as InferGetVersionsResult<Metadata, Throw>
}

async function fetchPackument<Throw extends boolean>(
  context: PackageContext,
  options: { fetch?: typeof fetch, throw?: Throw },
): Promise<NpmPackument | PackageError> {
  const fetchApi = options.fetch ?? fetch
  const url = new URL(context.parsed.escapedName, context.registry)
  const headers = new Headers({
    accept: 'application/json',
  })

  if (context.auth?.token) {
    headers.set('authorization', `Bearer ${context.auth.token}`)
  }
  else if (context.auth?.basicAuth) {
    headers.set('authorization', `Basic ${context.auth.basicAuth}`)
  }

  if (context.config.userAgent)
    headers.set('user-agent', context.config.userAgent)

  const response = await fetchApi(url, { headers })

  if (!response.ok) {
    const error = toPackageError(context.parsed.name, url, response.status, response.statusText)

    if (options.throw === false)
      return error

    throw new Error(error.error)
  }

  return response.json() as Promise<NpmPackument>
}

function filterVersionsByDate(versions: string[], time: Record<string, string>, after?: string): string[] {
  if (!after)
    return versions

  const afterDate = Date.parse(after)
  if (Number.isNaN(afterDate))
    return versions

  return versions.filter((version) => {
    const publishedAt = time[version]
    if (!publishedAt)
      return false

    return Date.parse(publishedAt) > afterDate
  })
}

function filterVersionsBySpecifier(
  availableVersions: string[],
  versions: Record<string, NpmPackumentVersion>,
  distTags: Record<string, string>,
  specifier: string,
  loose?: boolean,
): string[] {
  if (specifier === '*')
    return availableVersions

  const taggedVersion = distTags[specifier]
  if (taggedVersion)
    return availableVersions.includes(taggedVersion) ? [taggedVersion] : []

  if (validRange(specifier)) {
    return availableVersions.filter(version =>
      satisfies(version, specifier, { includePrerelease: true, loose: loose ?? false }),
    )
  }

  if (versions[specifier])
    return [specifier]

  return availableVersions
}

function isPackageError(value: NpmPackument | PackageError): value is PackageError {
  return 'error' in value
}

function resolveLatestVersion(
  availableVersions: string[],
  versions: Record<string, NpmPackumentVersion>,
  distTags: Record<string, string>,
  specifier: string,
): string | null {
  if (distTags[specifier])
    return distTags[specifier]

  if (versions[specifier])
    return specifier

  if (validRange(specifier))
    return maxSatisfying(availableVersions, specifier) ?? null

  return null
}

function toDistTags(distTags?: Record<string, string>): Record<string, string> & { latest: string } {
  return {
    latest: distTags?.latest ?? '',
    ...(distTags ?? {}),
  }
}

function toPackageError(name: string, url: URL, status: number, statusText: string): PackageError {
  return {
    status,
    name,
    error: `[GET] "${url}": ${status} ${statusText}`,
  }
}

function toPackageVersionMeta(version: NpmPackumentVersion, time?: string): PackageVersionMeta {
  return {
    time,
    engines: version.engines,
    deprecated: version.deprecated,
    provenance: version.provenance ?? version.dist?.provenance,
    integrity: version.integrity ?? version.dist?.integrity,
  }
}
