# qdash-agent-skills

Agent skills and helper scripts for working with QDash through `qdash-client` profiles and the QDash API.

This repository is intended to host reusable instructions and scripts for coding agents such as Codex, Claude Code, and other agent runtimes. Agent-specific metadata can live beside shared helper scripts.

## Skills

- `qdash-api`: query a running QDash instance through `qdash-client` profiles and the QDash OpenAPI. The current package is in Codex skill format, while its helper script and API policy are agent-agnostic. It covers chips, metrics, task results, issues, flows, executions, project files, projects, and provenance read paths.

## Example Prompts

Use `$qdash-api` when asking Codex to inspect a running QDash instance:

```text
Use $qdash-api to list chips from my local QDash profile.
Use $qdash-api to show the default chip and summarize its current metrics.
Use $qdash-api with profile anemone to list the latest 20 task results.
Use $qdash-api to find recent failed task results for chip-001.
Use $qdash-api to show the latest t1 values by qubit.
Use $qdash-api to fetch t1 history for Q00 on 20260625.
Use $qdash-api to list open issues and group them by task.
Use $qdash-api to inspect approved issue knowledge entries for readout tasks.
Use $qdash-api to list flows available in the current project.
Use $qdash-api to show recent executions for the default chip.
Use $qdash-api to inspect the project file tree without modifying files.
Use $qdash-api to summarize provenance stats and recent parameter changes.
Use $qdash-api to check which local qdash-client profiles are available, without printing secrets.
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
