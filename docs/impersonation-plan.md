# Browser impersonation implementation

Approved scope: persistent global/site settings; TikTok always uses Chrome initially;
other sites try normally then each available browser once. Discover compatible
existing Python installations when the regular yt-dlp lacks impersonation. Apply
the same execution strategy to analysis, filename lookup, downloads and resumes.
Preserve cancellation, pause, queue concurrency and selected formats/paths.

## Work and ownership

1. Settings backend: domain policy, validated versioned JSON persistence, commands.
2. Settings frontend: accessible settings dialog, typed API, behavioral tests.
3. Runtime integration: capability discovery, bounded retry policy, execution
   context, streaming progress, frontend download/analysis integration.
4. Integration review, tests, build and documentation.

## Shared contracts (camelCase JSON)

`AppSettings = { schemaVersion: 1, revision: number, impersonation: {
mode: 'automatic' | 'always' | 'never', browser: string,
sites: { domain: string, mode: same enum, browser: string | null }[] } }`.
Default: automatic / chrome, site tiktok.com = always / chrome.

Commands: `get_settings()`, `update_settings({ settings })`,
`get_impersonation_capabilities({ refresh?: boolean })`.
Capabilities: `{ runtimes: { id: string, label: string, version: string | null,
browsers: string[], error: string | null }[] }`.

Execution context: `{ settingsRevision: number, runtimeId: string,
browser: string | null }`. The backend treats this as a validated preference,
never as an executable path. Settings changes invalidate it.
Attempt progress: `{ browser: string | null, attempt: number }`.

## Decisions

- Work in the existing clean checkout on feat/browser-impersonation to keep
  changes immediately accessible to the user; no separate worktree needed.
- Frontend and backend settings tasks share only the contracts above; root owns
  module registration, Cargo dependencies, runtime and download integration.
- Keep UI in English and reuse existing Radix/shadcn primitives.
- Cookies are a future extension of the central request-options layer, not part
  of this implementation.

## Validation

Baseline: pnpm lint passes; 15 Rust tests pass. Add regression tests for policies,
capabilities, settings persistence, retry exhaustion and stop behavior; frontend
tests for settings and progress. Run Rust and frontend tests, TypeScript check,
frontend build and manual Tauri checks where available.

## Progress

- Settings backend implemented: defaults, validation, normalized site rules,
  revision conflicts and atomic persistence covered by tests.
- Settings frontend implemented with behavioral tests; review fixes include
  asynchronous response guards and locking the draft during saves.
- Runtime selection, shared retry policy, request context and streaming progress
  integrated across analysis, filename, download and resume.
- Review ruling: queued requests read settings after acquiring their slot so a
  saved revision takes effect before their first actual attempt.
- Review ruling: enumerate Windows Python launcher versions as well as default
  Python commands, to find profiles in nondefault installations.
- Real standard and forced-Chrome downloads passed against the public W3Schools
  sample video. The TikTok upstream test URL was rejected with an IP block by all
  profiles; the equivalent manual Python command receives the same rejection.
- Browser UI inspected at desktop size using mocked IPC; actual engine pipeline
  verified independently through the opt-in Rust smoke test.
- Preserve the submitted URL through filename and download requests, so a rule
  on a short-link domain remains effective after metadata reports a canonical URL.
- Final validation: 39 Rust tests passed (network smoke ignored by default),
  17 frontend tests passed, TypeScript and production frontend build passed.
  Vite reports a 556 kB main-chunk size advisory. Opt-in forced-Chrome smoke
  passed separately, including ffprobe validation of the downloaded video.
- Final scoped review found no remaining important introduced defects. Keyboard
  Escape restores focus to Settings; the dialog scrolls without horizontal
  overflow at the application's minimum 800x600 viewport.
