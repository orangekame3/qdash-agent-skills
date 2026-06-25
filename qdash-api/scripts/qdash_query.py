#!/usr/bin/env python3
from __future__ import annotations

import argparse
import configparser
import json
import os
import sys
from pathlib import Path
from typing import Any


SECRET_KEYS = {
    "api_token",
    "password",
    "cf_access_client_secret",
    "QDASH_API_TOKEN",
    "QDASH_PASSWORD",
    "QDASH_CF_ACCESS_CLIENT_SECRET",
}


def default_config_path() -> Path:
    xdg = os.getenv("XDG_CONFIG_HOME")
    if xdg:
        return Path(xdg).expanduser() / "qdash" / "config.ini"
    return Path("~/.config/qdash/config.ini").expanduser()


def add_qdash_checkout_to_path() -> None:
    candidates: list[Path] = []
    env_path = os.getenv("QDASH_REPO_PATH")
    if env_path:
        candidates.append(Path(env_path).expanduser())
    candidates.append(Path("~/src/github.com/oqtopus-team/qdash").expanduser())
    candidates.append(Path(__file__).resolve().parents[3] / "qdash")

    for repo in candidates:
        src = repo / "src"
        if (src / "qdash" / "client").exists():
            sys.path.insert(0, str(src))
            return


def import_client_types() -> tuple[Any, Any]:
    add_qdash_checkout_to_path()
    try:
        from qdash.client import QDashClient, QDashConfig  # type: ignore
    except ModuleNotFoundError as exc:
        missing = exc.name or str(exc)
        if missing == "qdash":
            raise SystemExit(
                "Could not import qdash.client. Install qdash-client or set QDASH_REPO_PATH "
                "to a local oqtopus-team/qdash checkout."
            ) from exc
        raise SystemExit(
            f"Could not import qdash.client dependency '{missing}'. Install qdash-client, "
            "or run with: uv run --with qdash-client python "
            "qdash-api/scripts/qdash_query.py ..."
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(
            f"Could not import qdash.client: {exc.__class__.__name__}: {exc}"
        ) from exc
    return QDashClient, QDashConfig


def to_jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return to_jsonable(value.model_dump(mode="json"))
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [to_jsonable(item) for item in value]
    return value


def print_json(value: Any) -> None:
    print(json.dumps(to_jsonable(value), indent=2, sort_keys=True, ensure_ascii=False))


def parse_params(raw: str | None) -> dict[str, Any] | None:
    if raw is None:
        return None
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise SystemExit("--params must be a JSON object")
    return parsed


def load_client(args: argparse.Namespace) -> Any:
    QDashClient, QDashConfig = import_client_types()
    if args.env:
        return QDashClient.from_env()
    if args.config:
        return QDashClient.from_profile(args.profile, path=args.config)
    return QDashClient.from_profile(args.profile)


def command_config_path(args: argparse.Namespace) -> None:
    path = Path(args.config).expanduser() if args.config else default_config_path()
    parser = configparser.ConfigParser()
    exists = path.exists()
    profiles: list[str] = []
    if exists:
        parser.read(path)
        profiles = parser.sections()
    print_json({"path": str(path), "exists": exists, "profiles": profiles})


def command_chips(args: argparse.Namespace) -> None:
    client = load_client(args)
    try:
        print_json(client.list_chips())
    finally:
        client.close()


def command_default_chip(args: argparse.Namespace) -> None:
    client = load_client(args)
    try:
        print_json(client.get_default_chip())
    finally:
        client.close()


def command_metrics_config(args: argparse.Namespace) -> None:
    client = load_client(args)
    try:
        print_json(client.get_metrics_config())
    finally:
        client.close()


def command_chip_metrics(args: argparse.Namespace) -> None:
    client = load_client(args)
    try:
        chip_id = args.chip_id or client.get_default_chip_id()
        print_json(client.get_chip_metrics(chip_id))
    finally:
        client.close()


def command_timeseries(args: argparse.Namespace) -> None:
    client = load_client(args)
    try:
        chip_id = args.chip_id or client.get_default_chip_id()
        print_json(
            client.get_task_results_timeseries(
                chip_id=chip_id,
                parameter=args.parameter,
                tag=args.tag,
                qid=args.qid,
                start_at=args.start_at,
                end_at=args.end_at,
            )
        )
    finally:
        client.close()


def command_raw_get(args: argparse.Namespace) -> None:
    client = load_client(args)
    try:
        response = client._request("GET", args.path, params=parse_params(args.params))  # noqa: SLF001
        print_json({"status_code": response.status_code, "data": response.data})
    finally:
        client.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read QDash data through qdash-client profiles.")
    parser.add_argument("--profile", default="default", help="qdash-client profile name")
    parser.add_argument("--config", help="Path to qdash config.ini")
    parser.add_argument("--env", action="store_true", help="Load QDASH_* environment variables")

    sub = parser.add_subparsers(dest="command", required=True)

    config_path = sub.add_parser("config-path", help="Show config path and profile names only")
    config_path.set_defaults(func=command_config_path)

    chips = sub.add_parser("chips", help="List chips")
    chips.set_defaults(func=command_chips)

    default_chip = sub.add_parser("default-chip", help="Show the default chip")
    default_chip.set_defaults(func=command_default_chip)

    metrics_config = sub.add_parser("metrics-config", help="Show metrics configuration")
    metrics_config.set_defaults(func=command_metrics_config)

    chip_metrics = sub.add_parser("chip-metrics", help="Show dashboard metrics for a chip")
    chip_metrics.add_argument("--chip-id", help="Defaults to get_default_chip_id()")
    chip_metrics.set_defaults(func=command_chip_metrics)

    timeseries = sub.add_parser("timeseries", help="Show task result time-series data")
    timeseries.add_argument("--chip-id", help="Defaults to get_default_chip_id()")
    timeseries.add_argument("--parameter", required=True)
    timeseries.add_argument("--tag")
    timeseries.add_argument("--qid")
    timeseries.add_argument("--start-at", required=True)
    timeseries.add_argument("--end-at", required=True)
    timeseries.set_defaults(func=command_timeseries)

    raw_get = sub.add_parser("raw-get", help="Run a read-only GET request against an API path")
    raw_get.add_argument("--path", required=True)
    raw_get.add_argument("--params", help="JSON object of query parameters")
    raw_get.set_defaults(func=command_raw_get)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
    except Exception as exc:  # noqa: BLE001
        print_json({"error": exc.__class__.__name__, "message": str(exc)})
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
