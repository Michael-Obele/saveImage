# Contributing

## Local development

```bash
bun install
bun run dev              # Chrome dev server with HMR
bun run dev:firefox      # Firefox dev server with HMR
bun run check            # svelte-check / TypeScript
```

## Before you push — verify the CI workflow locally

The project ships with a GitHub Actions workflow at
[`.github/workflows/build.yml`](.github/workflows/build.yml) that builds and
zips the extension for Chrome and Firefox on every push to `main`. You can
exercise the same workflow locally with [`act`](https://nektosact.com) so you
catch YAML / matrix / artifact issues before opening a PR.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) running
- [`act`](https://nektosact.com/installation/) installed

### Pick a speed tier

| Tier                         | Command                                       | Time                   | What it validates                                |
| ---------------------------- | --------------------------------------------- | ---------------------- | ------------------------------------------------ |
| 1. List jobs                 | `bun run act:list`                            | <1s                    | Workflow is parseable, job/step names render     |
| 2. Dry-run                   | `bun run act:dry`                             | 1–2s                   | Matrix expands, all steps resolve, no execution  |
| 3. One job, reused container | `bun run act:chrome` or `bun run act:firefox` | 5–15s after first run  | Real `bun install` + `wxt zip` + artifact upload |
| 4. Full matrix               | `bun run act:all`                             | 10–30s after first run | Both Chrome and Firefox end-to-end               |

> **Heads up:** the first run is slower (~1–2 min) because `act` pulls the
> `catthehacker/ubuntu:act-latest` image. Subsequent runs with `--reuse` reuse
> the warm container, so `bun install` and image pulls are skipped.

### Skip `act` entirely

If you only want to validate that the _build_ works (and you trust the YAML
plumbing), `act` is overkill:

```bash
bun run ci:verify
```

That runs the same steps the CI runs — `bun install`, `wxt prepare`,
`svelte-check`, both `wxt zip` targets — but on your host, no Docker, no
`act`. It's the fastest feedback loop.

## Code health — fallow

The project uses [fallow](https://docs.fallow.tools) to catch dead code,
duplication, and complexity regressions. The config lives in
[`.fallowrc.jsonc`](.fallowrc.jsonc) and is tuned for the WXT layout
(declares the WXT entrypoints, ignores build artifacts, suppresses
WXT-internal devDependencies that fallow can't see through direct
`import` statements).

| Command                 | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `bun run fallow`        | Dead-code analysis (unused files / exports / types / deps / cycles) |
| `bun run fallow:health` | Function complexity + hotspots                                      |
| `bun run fallow:dupes`  | Cross-file duplication                                              |
| `bun run fallow:audit`  | Combined report scoped to files changed since `main`                |
| `bun run fallow:fix`    | **Dry-run** auto-fix preview — review before applying               |

### Adding a new dependency

If you `bun add` a package and `bun run fallow` reports it as unused, the
package is almost certainly resolved at build time (e.g. another WXT
module, a `wxt.config.ts` plugin). Add it to `ignoreDependencies` in
`.fallowrc.jsonc` with a one-line comment explaining why.

### Adding a new WXT entrypoint

Drop the file into `src/entrypoints/…` and add the path to the `entry`
array in `.fallowrc.jsonc`. (WXT only watches `entrypoints/` at _build_
time; fallow needs to be told about it explicitly for graph analysis.)

### Wiring into CI

The workflow doesn't run fallow yet because the repo is small and the
trade-off (extra ~5s per build) isn't worth it today. When the codebase
grows past ~30 source files, add a `fallow` job after the build that runs
`bun run fallow:audit` with `--fail-on-issues` so dead code on a PR fails
the check.

### Recommended workflow

1. Edit the workflow YAML.
2. `bun run act:dry` to confirm matrix + steps still parse.
3. `bun run act:chrome` to confirm the build path works end-to-end.
4. If you touched `firefox` paths: `bun run act:firefox`.
5. `git push`.

### Useful flags

- `act -v` — verbose output, useful for debugging action resolution
- `act --reuse` — keep the container warm between runs (already on by default in the scripts above)
- `act -s ACTIONS_STEP_DEBUG=true` — enable GitHub Actions debug logging
- `act --graph` — print a Mermaid/Graphviz graph of the workflow (great for visualizing matrix)

### Known limitations of `act` vs. real GitHub Actions

- `GITHUB_TOKEN` doesn't have the same permissions as on github.com
- `actions/cache` works but is local-only
- The container is Linux-only — fine for this workflow, which only declares `ubuntu-latest`
- Matrix jobs that bind to the same host port can collide (not an issue here)

If `act` is green but CI is red, the usual suspects are: environment
variables, secret access, or third-party action behavior — not the workflow
structure.
