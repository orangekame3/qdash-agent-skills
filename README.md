# qdash-agent-skills

Agent skills and helper scripts for working with QDash through `qdash-client` profiles and the QDash API.

This repository is intended to host reusable instructions and scripts for coding agents such as Codex, Claude Code, and other agent runtimes. Agent-specific metadata can live beside shared helper scripts.

## Skills

- `qdash-api`: query a running QDash instance through `qdash-client` profiles and the QDash OpenAPI. The current package is in Codex skill format, while its helper script and API policy are agent-agnostic. It covers chips, metrics, task results, issues, flows, executions, project files, projects, and provenance read paths.

## Effective Prompts

Ask from the QDash side. Include the profile, target chip or entity, time range, and the summary shape you want. Add "read-only" when inspecting project files, git state, flows, or executions.

Good prompt shape:

```text
Use $qdash-api. In profile <profile>, inspect <QDash target> for <chip/entity/time range>. Summarize <what to compare or flag>. Do not modify anything.
```

Examples:

```text
Use $qdash-api. Check which qdash-client profiles exist and do not print secrets.
Use $qdash-api. In profile anemone, summarize the default chip metrics and flag weak qubits.
Use $qdash-api. In profile anemone, show the latest 20 failed task results for chip-001 and group them by task name.
Use $qdash-api. For chip-001, compare recent t1 values by qubit and call out outliers.
Use $qdash-api. Fetch t1 history for Q00 on 20260625 and summarize the trend.
Use $qdash-api. List open QDash issues, group them by task, and mention linked task IDs.
Use $qdash-api. Inspect approved issue knowledge for readout tasks and summarize reusable fixes.
Use $qdash-api. Read-only: list QDash flows and recent executions for the default chip.
Use $qdash-api. Read-only: inspect the QDash project file tree and git status.
Use $qdash-api. Summarize provenance stats and recent parameter changes from the last 24 hours.
```

## Runtime Policy

The public/default path is `qdash-client`, preferably through ephemeral `uv` execution:

```bash
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local chips
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local task-results --limit 20
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local issues --limit 20
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local provenance-stats
```

Use a local `oqtopus-team/qdash` checkout only for qdash-client development or unreleased API changes:

```bash
QDASH_REPO_PATH=~/src/github.com/oqtopus-team/qdash \
  uv run --with httpx --with pydantic python qdash-api/scripts/qdash_query.py --profile local chips
```

Do not make `curl` the normal transport. These skills rely on `qdash-client` for profile loading, auth headers, Cloudflare Access headers, project headers, retries, and response normalization.

## Codex Local Use

Point Codex at this repository's skill folder, or copy/symlink the skill directory into your Codex skills directory.

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
ln -s "$PWD/qdash-api" "${CODEX_HOME:-$HOME/.codex}/skills/qdash-api"
```

## Other Agents

For Claude Code or other agents, reuse the same runtime policy and helper scripts. The core entry point is:

```bash
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local chips
```

Agent-specific wrappers should call the shared helper instead of rebuilding QDash authentication with shell commands.

## Safety Defaults

The helper is read-only by default. Operational actions such as git push/pull, flow execution, task re-execution, task exclusion, admin changes, auth changes, and project membership changes should require an agent to state the exact endpoint/action and get explicit user confirmation before running.
