# qdash-agent-skills

Agent skills and helper scripts for working with QDash through `qdash-client` profiles and the QDash API.

This repository is intended to host reusable instructions and scripts for coding agents such as Codex, Claude Code, and other agent runtimes. Agent-specific metadata can live beside shared helper scripts.

## Skills

- `qdash`: query a running QDash instance through `qdash-client` profiles and the QDash OpenAPI. The current package is in Codex skill format, while its helper script and API policy are agent-agnostic. It covers chips, chip topology, metrics, task results, task knowledge, AI reviews, issues, flows, executions, project files, projects, and provenance read paths.

Skills live under `skills/*/SKILL.md` so `gh skill install` can discover them directly from this repository.

## Effective Prompts

Ask from the QDash side. Include the profile, target chip or entity, time range, and the summary shape you want. Add "read-only" when inspecting project files, git state, flows, or executions.

Good prompt shape:

```text
Use $qdash. In profile <profile>, inspect <QDash target> for <chip/entity/time range>. Summarize <what to compare or flag>. Do not modify anything.
```

Examples:

```text
Use $qdash. Check which qdash-client profiles exist and do not print secrets.
Use $qdash. In profile <profile>, summarize the default chip metrics and flag weak qubits.
Use $qdash. In profile <profile>, show the latest 20 failed task results for chip-001 and group them by task name.
Use $qdash. For chip-001, compare recent t1 values by qubit and call out outliers.
Use $qdash. Fetch t1 history for Q00 on 20260625 and summarize the trend.
Use $qdash. List open QDash issues, group them by task, and mention linked task IDs.
Use $qdash. Inspect approved issue knowledge for readout tasks and summarize reusable fixes.
Use $qdash. Read-only: list QDash flows and recent executions for the default chip.
Use $qdash. Read-only: inspect the QDash project file tree and git status.
Use $qdash. Summarize provenance stats and recent parameter changes from the last 24 hours.
```

## Runtime Policy

The public/default path is `qdash-client`, preferably through ephemeral `uv` execution:

```bash
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local chips
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local chip-qubits --limit 20
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local task-results --limit 20
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local task-knowledge --task-name t1
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local issues --limit 20
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local flow-templates
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local ai-reviews --limit 20
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local provenance-stats
```

Use a local `oqtopus-team/qdash` checkout only for qdash-client development or unreleased API changes:

```bash
QDASH_REPO_PATH=~/src/github.com/oqtopus-team/qdash \
  uv run --with httpx --with pydantic python skills/qdash/scripts/qdash_query.py --profile local chips
```

Do not make `curl` the normal transport. These skills rely on `qdash-client` for profile loading, auth headers, Cloudflare Access headers, project headers, retries, and response normalization.

## Install

Install with the npm wrapper:

```bash
npx qdash-agent-skills install
npx qdash-agent-skills update
npx qdash-agent-skills doctor
```

The wrapper copies `skills/qdash` into the Codex user skill directory by default and
checks local prerequisites without printing secrets. The Python helper remains the
QDash API runtime.

For a project-local Codex skill install, use project scope:

```bash
npx qdash-agent-skills install --scope project
npx qdash-agent-skills update --scope project
npx qdash-agent-skills install --scope project --project-dir /path/to/project
```

Use `--target` when you need an explicit destination; it takes precedence over
`--scope` and `--project-dir`.

Install the `qdash` skill with GitHub CLI:

```bash
gh skill install orangekame3/qdash-agent-skills qdash --agent codex --scope user
```

For project-local installation, use `--scope project`. During local development, install from this checkout:

```bash
gh skill install . qdash --from-local --agent codex --scope user --force
```

During npm-package development, run the wrapper directly:

```bash
node bin/qdash-agent-skills.js path
node bin/qdash-agent-skills.js install --dry-run
node bin/qdash-agent-skills.js update --dry-run
node bin/qdash-agent-skills.js doctor
```

## Release

The npm package publishes from GitHub Actions when a `v*` tag is pushed, or when
the publish workflow is run manually. Configure the repository secret `NPM_TOKEN`
with an npm automation token before publishing.

```bash
npm version patch
git push origin main --tags
```

## Other Agents

For Claude Code or other agents, reuse the same runtime policy and helper scripts. The core entry point is:

```bash
uv run --with qdash-client python skills/qdash/scripts/qdash_query.py --profile local chips
```

Agent-specific wrappers should call the shared helper instead of rebuilding QDash authentication with shell commands.

## Safety Defaults

The helper is read-only by default. Operational actions such as git push/pull, flow execution, task re-execution, task exclusion, admin changes, auth changes, and project membership changes should require an agent to state the exact endpoint/action and get explicit user confirmation before running.
