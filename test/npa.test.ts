import { describe, expect, it } from 'vitest'
import { parseNpmSpec } from '../src/npa'

describe('parseNpmSpec', () => {
  it('parses an unscoped package without a raw spec', () => {
    expect(parseNpmSpec({ spec: 'foo' })).toEqual({
      raw: 'foo',
      name: 'foo',
      escapedName: 'foo',
      scope: undefined,
      rawSpec: '',
    })
  })

  it('parses an unscoped package with a version-like spec', () => {
    expect(parseNpmSpec({ spec: 'foo@1.2.3' })).toEqual({
      raw: 'foo@1.2.3',
      name: 'foo',
      escapedName: 'foo',
      scope: undefined,
      rawSpec: '1.2.3',
    })
  })

  it('parses a scoped package with a tag-like spec', () => {
    expect(parseNpmSpec({ spec: '@scope/foo@beta' })).toEqual({
      raw: '@scope/foo@beta',
      name: '@scope/foo',
      escapedName: '@scope%2ffoo',
      scope: '@scope',
      rawSpec: 'beta',
    })
  })

  it('trims surrounding whitespace before parsing', () => {
    expect(parseNpmSpec({ spec: '  @scope/foo@latest  ' })).toEqual({
      raw: '@scope/foo@latest',
      name: '@scope/foo',
      escapedName: '@scope%2ffoo',
      scope: '@scope',
      rawSpec: 'latest',
    })
  })

  it('rejects file protocol specs', () => {
    expect(() => parseNpmSpec({ spec: 'file:./pkg.tgz' })).toThrow(
      'Unsupported file package spec "file:./pkg.tgz" for get-npm-meta.',
    )
  })

  it('rejects npm alias specs', () => {
    expect(() => parseNpmSpec({ spec: 'npm:react@18' })).toThrow(
      'Unsupported npm alias package spec "npm:react@18" for get-npm-meta.',
    )
  })

  it('rejects local path specs', () => {
    expect(() => parseNpmSpec({ spec: './local-package' })).toThrow(
      'Unsupported local path package spec "./local-package" for get-npm-meta.',
    )
  })

  it('rejects url specs', () => {
    expect(() => parseNpmSpec({ spec: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz' })).toThrow(
      'Unsupported url package spec "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz" for get-npm-meta.',
    )
  })

  it('rejects git specs', () => {
    expect(() => parseNpmSpec({ spec: 'git@github.com:npm/cli.git' })).toThrow(
      'Unsupported git package spec "git@github.com:npm/cli.git" for get-npm-meta.',
    )
  })

  it('rejects invalid scoped package names', () => {
    expect(() => parseNpmSpec({ spec: '@scope/' })).toThrow(
      'Invalid scoped package spec "@scope/".',
    )
  })
})
