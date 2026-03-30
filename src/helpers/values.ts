import type { RawConfigValue } from './types'

export function readBoolean(value: RawConfigValue | undefined, fallback: boolean) {
  const stringValue = readString(value)
  if (stringValue === undefined)
    return fallback
  if (stringValue === '')
    return true
  return stringValue.toLowerCase() !== 'false'
}

export function readString(value: RawConfigValue | undefined) {
  if (typeof value === 'string')
    return value
}

export function readStringArray(value: RawConfigValue | undefined) {
  if (Array.isArray(value))
    return value
  if (typeof value === 'string' && value.length > 0)
    return value.split('\n\n')
  return []
}
