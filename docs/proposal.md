# NPM Registry Client Positioning

## Quick Take

`fast-npm-meta` is valuable because it does **not** fetch the full registry metadata directly from the client in the common case. Instead, it talks to a lightweight proxy API that caches and reduces the payload on the server side.

This new library should take a different position:

- it is a **direct registry client**
- it is **private-registry aware**
- it is **read-only**
- it is designed for **Node.js tooling**

In short:

- `fast-npm-meta` = public-registry optimized proxy client
- this library = private-registry aware direct metadata client

## Why This Library Exists

Node.js tooling often needs only a small subset of npm capabilities:

- read npm config
- resolve the effective registry for a package
- resolve authentication for that registry
- fetch package metadata
- read `dist-tags.latest` or related read-only metadata

Existing options have a gap:

- `fast-npm-meta` is intentionally lightweight and proxy-oriented
- `@npmcli/config` + `npm-registry-fetch` are feature-rich but heavy for tooling

This library fills the middle ground.

## Product Intent

The library should be a small, focused package for:

- reading npm configuration relevant to registry resolution
- resolving scoped and default registries
- resolving auth headers for private registries
- fetching package metadata from the resolved registry
- exposing high-level helpers for common tooling use cases

It should be published as a standalone package and consumed by `pncat`.

## Core Positioning

### What It Is

- a read-only npm metadata client
- a direct registry client for Node.js tools
- compatible with npmjs, Artifactory, Nexus, Verdaccio, and similar registries
- optimized for CLI and automation use cases

### What It Is Not

- not an installer
- not a publisher
- not a full replacement for `npm-registry-fetch`
- not a full npm CLI compatibility layer
- not primarily a browser-first package

## Relationship to `fast-npm-meta`

This library should be framed as **complementary**, not competitive.

`fast-npm-meta` still has clear advantages:

- extremely lightweight client
- efficient public npm proxy API
- server-side caching and response reduction
- strong fit for public-registry version lookups

This library should instead win on:

- private registry support
- auth-aware direct access
- minimal Node tooling integration
- better fit for internal registries and enterprise environments

## Suggested Capability Boundary

### Must Have

- parse package name and scope
- load npm config from the current environment
- resolve `registry` and `@scope:registry`
- resolve common auth forms
- fetch package manifest
- expose `getLatestVersion`, `getDistTags`, and `getManifest`

### Nice to Have

- optional fallback to `fast-npm-meta` for public npm
- configurable fetch implementation
- retry and timeout support
- lightweight caching hooks

### Out of Scope

- package installation
- package publishing
- lockfile manipulation
- full npm config parity
- every historical auth edge case from npm CLI

## Recommended API Shape

Two layers are recommended.

### Low-Level Primitives

- `loadNpmConfig()`
- `resolveRegistry(packageName, config)`
- `resolveAuth(registryUrl, config)`
- `fetchPackageManifest(packageName, options)`

### High-Level Helpers

- `getLatestVersion(packageName, options)`
- `getDistTags(packageName, options)`
- `getManifest(packageName, options)`

## Packaging Strategy

- publish as an independent package
- keep `pncat` as the first consumer
- design the package around real `pncat` requirements first
- avoid over-generalizing the API before the first stable adoption cycle

## Naming Direction

The name should communicate:

- npm registry awareness
- metadata focus
- client-side direct access
- tooling friendliness

## One-Sentence Positioning

> A lightweight, private-registry-aware, read-only npm metadata client for Node.js tooling.

## Short Tagline Options

- Read npm metadata directly, with private registry support.
- A direct npm registry client for Node.js tools.
- Lightweight npm metadata access for public and private registries.
