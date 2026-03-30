interface PackumentVersionProvenance {
  dist?: {
    attestations?: {
      provenance?: unknown
    }
    provenance?: 'trustedPublisher' | boolean
  }
  provenance?: 'trustedPublisher' | boolean
}

export function getPackumentVersionProvenance(version: PackumentVersionProvenance): 'trustedPublisher' | boolean | undefined {
  if (version.provenance !== undefined)
    return version.provenance

  if (version.dist?.provenance !== undefined)
    return version.dist.provenance

  if (version.dist?.attestations?.provenance)
    return true
}
