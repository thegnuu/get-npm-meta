import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLatestVersion, getLatestVersionBatch, getVersions, getVersionsBatch } from '../src/api'

const fastApiMocks = vi.hoisted(() => ({
  getLatestVersion: vi.fn(),
  getLatestVersionBatch: vi.fn(),
  getVersions: vi.fn(),
  getVersionsBatch: vi.fn(),
}))

vi.mock('fast-npm-meta', async (importActual) => {
  const actual = await importActual<typeof import('fast-npm-meta')>()

  return {
    ...actual,
    getLatestVersion: fastApiMocks.getLatestVersion,
    getLatestVersionBatch: fastApiMocks.getLatestVersionBatch,
    getVersions: fastApiMocks.getVersions,
    getVersionsBatch: fastApiMocks.getVersionsBatch,
  }
})

const tempDirs: string[] = []
const tempRoot = fileURLToPath(new URL('./.tmp/', import.meta.url))

function createTempWorkspace() {
  mkdirSync(tempRoot, { recursive: true })
  const root = mkdtempSync(join(tempRoot, 'get-npm-meta-api-'))
  const home = join(root, 'home')
  const project = join(root, 'project')

  mkdirSync(home)
  mkdirSync(project)
  tempDirs.push(root)

  return { home, project }
}

function createPackumentResponse(body: unknown, status = 200, statusText = 'OK') {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: {
      'content-type': 'application/json',
    },
  })
}

afterEach(() => {
  vi.clearAllMocks()

  for (const tempDir of tempDirs.splice(0))
    rmSync(tempDir, { recursive: true, force: true })
  rmSync(tempRoot, { recursive: true, force: true })
})

describe('api', () => {
  it('delegates getLatestVersion to fast-npm-meta for the default registry', async () => {
    const { home, project } = createTempWorkspace()
    const sentinel = {
      name: 'react',
      specifier: 'latest',
      version: '19.2.4',
      publishedAt: '2026-01-26T18:23:10.244Z',
      lastSynced: 1774881382894,
    }

    fastApiMocks.getLatestVersion.mockResolvedValueOnce(sentinel)

    const result = await getLatestVersion('react', {
      cwd: project,
      env: { HOME: home },
    })

    expect(result).toEqual(sentinel)
    expect(fastApiMocks.getLatestVersion).toHaveBeenCalledWith('react', {})
  })

  it('delegates getVersionsBatch to fast-npm-meta when every package uses the default registry', async () => {
    const { home, project } = createTempWorkspace()
    const sentinel = [
      {
        name: 'react',
        specifier: '*',
        versions: ['19.2.4'],
        distTags: { latest: '19.2.4' },
        time: {
          'created': '2024-01-01T00:00:00.000Z',
          'modified': '2024-02-01T00:00:00.000Z',
          '19.2.4': '2024-02-01T00:00:00.000Z',
        },
        lastSynced: 1,
      },
    ]

    fastApiMocks.getVersionsBatch.mockResolvedValueOnce(sentinel)

    const result = await getVersionsBatch(['react'], {
      cwd: project,
      env: { HOME: home },
      metadata: false,
    })

    expect(result).toEqual(sentinel)
    expect(fastApiMocks.getVersionsBatch).toHaveBeenCalledWith(['react'], { metadata: false })
  })

  it('fetches custom scoped registries directly and normalizes latest-version metadata', async () => {
    const { home, project } = createTempWorkspace()

    writeFileSync(join(project, '.npmrc'), [
      '@demo:registry=https://private.example/npm/',
      '//private.example/npm/:_authToken=demo-token',
    ].join('\n'))

    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('https://private.example/npm/@demo%2fpkg')

      const headers = new Headers(init?.headers)
      expect(headers.get('authorization')).toBe('Bearer demo-token')
      expect(headers.get('accept')).toBe('application/json')

      return createPackumentResponse({
        'name': '@demo/pkg',
        'dist-tags': {
          latest: '2.0.0',
        },
        'versions': {
          '1.0.0': {
            dist: { integrity: 'sha512-1.0.0' },
          },
          '1.2.0': {
            engines: { node: '>=18' },
            dist: { integrity: 'sha512-1.2.0' },
          },
          '2.0.0': {
            dist: { integrity: 'sha512-2.0.0' },
          },
        },
        'time': {
          'created': '2024-01-01T00:00:00.000Z',
          'modified': '2024-06-01T00:00:00.000Z',
          '1.0.0': '2024-01-02T00:00:00.000Z',
          '1.2.0': '2024-03-01T00:00:00.000Z',
          '2.0.0': '2024-05-01T00:00:00.000Z',
        },
      })
    })

    const result = await getLatestVersion('@demo/pkg@^1.0.0', {
      cwd: project,
      env: { HOME: home },
      fetch: fetchMock,
      metadata: true,
    })

    expect(result).toEqual({
      name: '@demo/pkg',
      specifier: '^1.0.0',
      version: '1.2.0',
      publishedAt: '2024-03-01T00:00:00.000Z',
      lastSynced: expect.any(Number),
      time: '2024-03-01T00:00:00.000Z',
      engines: { node: '>=18' },
      integrity: 'sha512-1.2.0',
    })
    expect(fastApiMocks.getLatestVersion).not.toHaveBeenCalled()
  })

  it('returns direct registry versions metadata in the fast-npm-meta shape', async () => {
    const { home, project } = createTempWorkspace()

    writeFileSync(join(project, '.npmrc'), 'registry=https://private.example/npm/\n')

    const fetchMock = vi.fn(async () => createPackumentResponse({
      'name': 'demo',
      'dist-tags': {
        latest: '2.0.0',
        beta: '2.1.0-beta.1',
      },
      'versions': {
        '1.0.0': {
          dist: { integrity: 'sha512-1.0.0' },
        },
        '2.0.0': {
          deprecated: 'legacy',
          dist: { integrity: 'sha512-2.0.0' },
        },
      },
      'time': {
        'created': '2024-01-01T00:00:00.000Z',
        'modified': '2024-06-01T00:00:00.000Z',
        '1.0.0': '2024-01-02T00:00:00.000Z',
        '2.0.0': '2024-05-01T00:00:00.000Z',
      },
    }))

    const result = await getVersions('demo', {
      cwd: project,
      env: { HOME: home },
      fetch: fetchMock,
      metadata: true,
      after: '2024-02-01T00:00:00.000Z',
    })

    expect(result).toEqual({
      name: 'demo',
      specifier: '*',
      distTags: {
        latest: '2.0.0',
        beta: '2.1.0-beta.1',
      },
      versionsMeta: {
        '2.0.0': {
          time: '2024-05-01T00:00:00.000Z',
          deprecated: 'legacy',
          integrity: 'sha512-2.0.0',
        },
      },
      timeCreated: '2024-01-01T00:00:00.000Z',
      timeModified: '2024-06-01T00:00:00.000Z',
      lastSynced: expect.any(Number),
    })
  })

  it('keeps mixed batch requests working across default and custom registries', async () => {
    const { home, project } = createTempWorkspace()

    writeFileSync(join(project, '.npmrc'), [
      '@demo:registry=https://private.example/npm/',
    ].join('\n'))

    fastApiMocks.getLatestVersion.mockResolvedValueOnce({
      name: 'react',
      specifier: 'latest',
      version: '19.2.4',
      publishedAt: '2026-01-26T18:23:10.244Z',
      lastSynced: 1774881382894,
    })

    const fetchMock = vi.fn(async () => createPackumentResponse({
      'name': '@demo/pkg',
      'dist-tags': {
        latest: '1.0.0',
      },
      'versions': {
        '1.0.0': {
          dist: { integrity: 'sha512-1.0.0' },
        },
      },
      'time': {
        'created': '2024-01-01T00:00:00.000Z',
        'modified': '2024-01-02T00:00:00.000Z',
        '1.0.0': '2024-01-02T00:00:00.000Z',
      },
    }))

    const result = await getLatestVersionBatch(['react', '@demo/pkg'], {
      cwd: project,
      env: { HOME: home },
      fetch: fetchMock,
    })

    expect(result).toEqual([
      {
        name: 'react',
        specifier: 'latest',
        version: '19.2.4',
        publishedAt: '2026-01-26T18:23:10.244Z',
        lastSynced: 1774881382894,
      },
      {
        name: '@demo/pkg',
        specifier: 'latest',
        version: '1.0.0',
        publishedAt: '2024-01-02T00:00:00.000Z',
        lastSynced: expect.any(Number),
      },
    ])
    expect(fastApiMocks.getLatestVersion).toHaveBeenCalledTimes(1)
  })

  it('returns fast-compatible error objects for direct registry 404 responses when throw is false', async () => {
    const { home, project } = createTempWorkspace()

    writeFileSync(join(project, '.npmrc'), 'registry=https://private.example/npm/\n')

    const result = await getLatestVersion('missing-package', {
      cwd: project,
      env: { HOME: home },
      fetch: vi.fn(async () => createPackumentResponse({ error: 'not found' }, 404, 'Not Found')),
      throw: false,
    })

    expect(result).toEqual({
      status: 404,
      name: 'missing-package',
      error: '[GET] "https://private.example/npm/missing-package": 404 Not Found',
    })
  })
})
