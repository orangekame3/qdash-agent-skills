# qdash-agent-skills

Agent skills and helper scripts for working with QDash through `qdash-client` profiles and the QDash API.

This repository is intended to host reusable instructions and scripts for coding agents such as Codex, Claude Code, and other agent runtimes. Agent-specific metadata can live beside shared helper scripts.

## Skills

- `qdash-api`: query a running QDash instance through `qdash-client` profiles and the QDash OpenAPI. The current package is in Codex skill format, while its helper script and API policy are agent-agnostic.

## Runtime Policy

The public/default path is `qdash-client`, preferably through ephemeral `uv` execution:

```bash
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local chips
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
