---
name: qdash-api
description: Work with a running QDash instance through qdash-client and saved local profiles. Use when an agent needs to inspect chips, metrics, task results, calibration data, provenance, project-scoped QDash API data, or OpenAPI endpoints from QDash using qdash-client, ~/.config/qdash/config.ini, XDG_CONFIG_HOME/qdash/config.ini, QDASH_* environment variables, or a local oqtopus-team/qdash checkout.
---

# QDash API

## Overview

Use this skill to let an agent query QDash through `qdash-client` instead of scraping the UI, calling `curl` directly, or hand-writing auth headers. Prefer saved profiles for credentials and keep tokens, Cloudflare Access secrets, passwords, and raw config contents out of conversation output.

For public/general use, assume `qdash-client` is the required API transport. Do not install it permanently unless the user asks; prefer ephemeral execution with `uv run --with qdash-client`.

## Quick Start

1. Locate the profile without printing secrets:

```bash
uv run --with qdash-client python qdash-api/scripts/qdash_query.py config-path
```

2. Run a read-only smoke check:

```bash
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local chips
```

3. Query common API data:

```bash
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local default-chip
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local metrics-config
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local chip-metrics --chip-id chip-001
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local timeseries --parameter t1 --start-at 2026-06-01T00:00:00Z --end-at 2026-06-08T00:00:00Z
```

For QDash development, set `QDASH_REPO_PATH` to a local `oqtopus-team/qdash` checkout to test unreleased client changes. The helper also probes `~/src/github.com/oqtopus-team/qdash`.

If using a local checkout and plain `python` does not have client dependencies, run the helper through `uv`:

```bash
uv run --with httpx --with pydantic python qdash-api/scripts/qdash_query.py --profile local chips
```

## Workflow

1. Use `config-path` first when the user mentions a local profile. Report only the path, available profile names, and whether the file exists.
2. Prefer `uv run --with qdash-client python qdash-api/scripts/qdash_query.py ...` for supported read-only operations because it handles profile loading, auth headers, model serialization, and error formatting through the official client.
3. Use `raw-get` for read-only endpoints not covered by first-class commands. It still goes through `qdash-client`; do not use `curl` as the normal path.
4. Use a local checkout fallback only for qdash-client development or unreleased API/client changes.
5. Before creating, updating, deleting, excluding, re-executing, pushing files, or triggering flows, state the exact endpoint/action and wait for user confirmation.
6. Summarize returned data instead of dumping huge JSON. Include counts, IDs, time ranges, and suspicious values that answer the user's question.

## API Reference

Read [references/qdash-api.md](references/qdash-api.md) when you need endpoint groups, local source locations, or examples for extending the helper.

Primary local sources in the QDash checkout:

- `src/qdash/client/README.md`
- `docs/user-guide/qdash-client.md`
- `docs/oas/openapi.json`
- `src/qdash/client/services/client.py`

## Safety

- Never print `api_token`, `password`, `cf_access_client_secret`, or full profile contents.
- Do not reconstruct auth headers in shell or `curl` unless the user explicitly asks for low-level debugging.
- Treat `/files/git/push`, `/files/git/pull`, `/flows/*/execute`, `re-execute`, `exclude`, admin, auth, and project membership endpoints as write or operationally sensitive.
- Prefer absolute UTC ISO timestamps with trailing `Z` for time-series calls.
- Close `QDashClient` instances when writing custom snippets.
