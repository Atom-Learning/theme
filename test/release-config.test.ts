import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

type Plugin = string | [string, Record<string, unknown>]
type ReleaseConfig = { branches: unknown[]; plugins: Plugin[] }

const ORIGINAL_REF = process.env.GITHUB_REF_NAME

// The config reads GITHUB_REF_NAME at module scope, so the module registry has
// to be reset between loads or every test sees the first branch's plugin list.
const loadConfig = async (branch: string | undefined): Promise<ReleaseConfig> => {
  vi.resetModules()
  if (branch === undefined) {
    delete process.env.GITHUB_REF_NAME
  } else {
    process.env.GITHUB_REF_NAME = branch
  }
  const { default: config } = await import('../release.config.js')
  return config as ReleaseConfig
}

const names = (plugins: Plugin[]) => plugins.map((p) => (Array.isArray(p) ? p[0] : p))

const optionsFor = (plugins: Plugin[], name: string) => {
  const entry = plugins.find(
    (p): p is [string, Record<string, unknown>] => Array.isArray(p) && p[0] === name
  )
  if (!entry) throw new Error(`${name} is not configured with options`)
  return entry[1]
}

afterEach(() => {
  if (ORIGINAL_REF === undefined) {
    delete process.env.GITHUB_REF_NAME
  } else {
    process.env.GITHUB_REF_NAME = ORIGINAL_REF
  }
})

describe('release config', () => {
  // Guards a silent, consumer-facing failure: if this flag is lost, prereleases
  // publish to `latest` and every consuming app picks them up on next install.
  it('publishes to the dist-tag matching the release channel', async () => {
    const config = await loadConfig(undefined)
    expect(optionsFor(config.plugins, '@semantic-release/exec').publishCmd).toContain(
      "--tag ${nextRelease.channel || 'latest'}"
    )
    // A ref that is neither main nor beta — including an unset one locally —
    // must fall back to the main-style set, never the stripped beta one.
    expect(names(config.plugins)).toContain('@semantic-release/changelog')
    expect(names(config.plugins)).toContain('@semantic-release/git')
  })

  // Yarn 1 points every command it runs at registry.yarnpkg.com, where npm
  // trusted publishing has no credentials.
  it('publishes to the npm registry explicitly', async () => {
    const config = await loadConfig('main')
    expect(optionsFor(config.plugins, '@semantic-release/exec').publishCmd).toContain(
      '--registry https://registry.npmjs.org'
    )
  })

  it('skips the changelog and commit-back on beta', async () => {
    const config = await loadConfig('beta')
    expect(names(config.plugins)).not.toContain('@semantic-release/changelog')
    expect(names(config.plugins)).not.toContain('@semantic-release/git')
    // The Slack plugin fails verifyConditions without its webhook, so beta must
    // not load it
    expect(names(config.plugins)).not.toContain('semantic-release-slack-bot')
    // Beta must not comment on the PRs its commits reference; main does that
    // when the work actually ships.
    expect(
      optionsFor(config.plugins, '@semantic-release/github').successCommentCondition
    ).toBe(false)
  })

  it('keeps the changelog and commit-back on main', async () => {
    const config = await loadConfig('main')
    expect(names(config.plugins)).toContain('semantic-release-slack-bot')
    expect(names(config.plugins)).toContain('@semantic-release/changelog')
    expect(names(config.plugins)).toContain('@semantic-release/git')
  })

  // cosmiconfig searches package.json BEFORE release.config.js, so a "release"
  // key reappearing there silently wins and this whole file stops being read —
  // taking the --tag flag with it, and publishing prereleases to `latest`.
  it('keeps the release config out of package.json', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    )
    expect(pkg).not.toHaveProperty('release')
  })

  // npm rejects a provenance-signed publish unless package.json names the
  // repository the workflow ran in.
  it('names the repository npm checks provenance against', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
    expect(pkg.repository.url).toBe('git+https://github.com/Atom-Learning/theme.git')
  })
})
