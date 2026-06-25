# QDash API Notes

Use this reference when a QDash request is outside the helper's common commands or when you need to extend the helper.

## Client Configuration

Use `qdash-client` as the standard transport. It reads profiles from `$XDG_CONFIG_HOME/qdash/config.ini`, or `~/.config/qdash/config.ini` when `XDG_CONFIG_HOME` is unset. Use `QDashClient.from_profile("profile-name")` for saved profiles and `QDashClient.from_env()` for `QDASH_*` variables.

Important profile keys:

- `base_url`
- `api_token`
- `project_id`
- `cf_access_client_id`
- `cf_access_client_secret`
- `timeout_seconds`
- `retry_max_attempts`
- `retry_backoff_seconds`
- `retry_max_backoff_seconds`
- `verify_tls`
- `proxy`
- `user_agent`

Do not display secret values. If debugging config, report whether a key is present, not its value.

## Common Read-Only Commands

```bash
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local chips
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local default-chip
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local metrics-config
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local chip-metrics --chip-id chip-001
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local timeseries --parameter t1 --qid Q00 --start-at 2026-06-01T00:00:00Z --end-at 2026-06-08T00:00:00Z
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local raw-get --path /projects
uv run --with qdash-client python qdash-api/scripts/qdash_query.py --profile local raw-get --path /task-results --params '{"limit": 20}'
```

For local qdash-client development, set `QDASH_REPO_PATH` to a checkout and run with client dependencies:

```bash
QDASH_REPO_PATH=~/src/github.com/oqtopus-team/qdash uv run --with httpx --with pydantic python qdash-api/scripts/qdash_query.py --profile local chips
```

Do not use `curl` as the default transport. Use it only for explicit low-level debugging after the user asks for it; otherwise rely on `qdash-client` for profile loading, auth headers, Cloudflare Access headers, project headers, retries, and response normalization.

## OpenAPI Locations

In a local `oqtopus-team/qdash` checkout:

- `docs/oas/openapi.json`: machine-readable OpenAPI spec.
- `docs/reference/openapi.md`: VitePress page that renders the OpenAPI viewer.
- `src/qdash/api/routers/`: FastAPI routers for endpoint behavior.
- `src/qdash/api/schemas/`: response and request schemas.
- `src/qdash/client/services/client.py`: current high-level `qdash-client` methods.

Useful path groups from the OpenAPI spec:

- `/chips`, `/chips/{chip_id}`, `/chips/{chip_id}/qubits`, `/chips/{chip_id}/couplings`
- `/metrics/config`, `/metrics/chips/{chip_id}/metrics`, `/metrics/chips/{chip_id}/qubits/{qid}/history`
- `/task-results`, `/task-results/timeseries`, `/task-results/qubits/latest`, `/task-results/couplings/latest`
- `/projects`, `/provenance/*`, `/issues`, `/issue-knowledge`, `/forum/posts`
- `/flows/*`, `/executions/*`, `/files/*`, `/admin/*`

Use `jq` to inspect methods and parameters:

```bash
jq '.paths["/task-results/timeseries"]' ~/src/github.com/oqtopus-team/qdash/docs/oas/openapi.json
jq -r '.paths | keys[]' ~/src/github.com/oqtopus-team/qdash/docs/oas/openapi.json
```

## Extending the Helper

Prefer adding a named command to `scripts/qdash_query.py` when an operation is likely to be reused. Keep commands read-only by default and implemented through `qdash-client`. For write operations, require an explicit flag such as `--confirm-write` and make the calling agent ask the user first.
