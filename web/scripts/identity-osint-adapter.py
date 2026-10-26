#!/usr/bin/env python3
"""Bounded JSON adapters for public/authorized identity OSINT workers.

Stdout is reserved for one final JSON object so the Node ASTRA worker can parse
results deterministically. Diagnostics go to stderr.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any


def emit(value: dict[str, Any]) -> None:
    print(json.dumps(value, ensure_ascii=False, separators=(",", ":")))


def normalize_username(value: str, *, telegram: bool = False, instagram: bool = False) -> str:
    raw = value.strip()
    if telegram:
        raw = re.sub(r"^https?://(?:t\.me|telegram\.me)/", "", raw, flags=re.I)
        raw = raw.lstrip("@").split("/", 1)[0]
        if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", raw):
            raise ValueError("invalid_telegram_username")
    elif instagram:
        raw = re.sub(r"^https?://(?:www\.)?instagram\.com/", "", raw, flags=re.I)
        raw = raw.lstrip("@").split("/", 1)[0]
        if not re.fullmatch(r"[A-Za-z0-9._]{1,30}", raw):
            raise ValueError("invalid_instagram_username")
    else:
        raw = raw.lstrip("@")
        if not re.fullmatch(r"[A-Za-z0-9_.-]{2,64}", raw):
            raise ValueError("invalid_username")
    return raw


def run_sherlock(username: str) -> dict[str, Any]:
    from sherlock_project.notify import QueryNotify
    from sherlock_project.result import QueryStatus
    from sherlock_project.sherlock import sherlock
    from sherlock_project.sites import SitesInformation

    username = normalize_username(username)
    with contextlib.redirect_stdout(sys.stderr):
        sites = SitesInformation()
        sites.remove_nsfw_sites()
        site_data = {site.name: site.information for site in sites}
        results = sherlock(
            username,
            site_data,
            QueryNotify(),
            timeout=max(2, min(int(os.getenv("DISHA_SHERLOCK_TIMEOUT_SECONDS", "4")), 10)),
        )

    found: list[dict[str, Any]] = []
    not_found = 0
    errors = 0
    for site_name, result in results.items():
        status = result.get("status")
        state = getattr(status, "status", None)
        if state == QueryStatus.CLAIMED:
            found.append({
                "site": site_name,
                "url": result.get("url_user"),
                "httpStatus": result.get("http_status"),
            })
        elif state == QueryStatus.AVAILABLE:
            not_found += 1
        else:
            errors += 1

    return {
        "username": username,
        "checked": len(results),
        "found": found[:500],
        "notFound": not_found,
        "errors": errors,
    }


async def run_maigret(username: str) -> dict[str, Any]:
    import maigret

    username = normalize_username(username)
    logger = logging.getLogger("disha.maigret")
    logger.handlers = [logging.NullHandler()]
    logger.setLevel(logging.ERROR)

    data_path = Path(maigret.__file__).resolve().parent / "resources" / "data.json"
    if not data_path.exists():
        raise RuntimeError("maigret_site_database_missing")

    top_sites = max(25, min(int(os.getenv("DISHA_MAIGRET_TOP_SITES", "300")), 1000))
    database = maigret.MaigretDatabase().load_from_file(str(data_path))
    sites = database.ranked_sites_dict(top=top_sites)
    with contextlib.redirect_stdout(sys.stderr):
        results = await maigret.search(
            username=username,
            site_dict=sites,
            timeout=10,
            logger=logger,
            max_connections=50,
            no_progressbar=True,
            is_parsing_enabled=False,
        )

    found: list[dict[str, Any]] = []
    errors = 0
    for site_name, result in results.items():
        status = result.get("status")
        try:
            is_found = bool(status and status.is_found())
        except Exception:
            is_found = False
        if is_found:
            found.append({
                "site": site_name,
                "url": result.get("url_user"),
                "httpStatus": result.get("http_status"),
                "rank": result.get("rank"),
            })
        elif getattr(status, "status", "") in {"ILLEGAL", "UNKNOWN"}:
            errors += 1

    return {
        "username": username,
        "checked": len(results),
        "found": found[:500],
        "errors": errors,
        "siteDatabase": str(data_path),
    }


def run_holehe(email: str) -> dict[str, Any]:
    if not re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}", email):
        raise ValueError("invalid_email")

    from types import SimpleNamespace

    import httpx
    import trio
    from holehe.core import get_functions, import_submodules, launch_module

    output: list[dict[str, Any]] = []

    async def execute() -> None:
        # Disable password-recovery-specific modules. DISHA only runs bounded
        # account-presence checks that the upstream package supports without them.
        args = SimpleNamespace(nopasswordrecovery=True)
        modules = import_submodules("holehe.modules")
        websites = get_functions(modules, args)
        timeout = max(3, min(int(os.getenv("DISHA_HOLEHE_TIMEOUT_SECONDS", "8")), 15))
        client = httpx.AsyncClient(timeout=timeout)
        try:
            async with trio.open_nursery() as nursery:
                for website in websites:
                    nursery.start_soon(launch_module, website, email, client, output)
        finally:
            await client.aclose()

    with contextlib.redirect_stdout(sys.stderr):
        trio.run(execute)

    found = []
    rate_limited = 0
    errors = 0
    for item in sorted(output, key=lambda entry: str(entry.get("name", ""))):
        if item.get("rateLimit"):
            rate_limited += 1
        if item.get("error"):
            errors += 1
        if item.get("exists") is True:
            found.append({
                "service": item.get("name"),
                "domain": item.get("domain"),
                "exists": True,
                "emailRecovery": item.get("emailrecovery"),
                "phoneNumber": item.get("phoneNumber"),
                "other": item.get("others"),
            })

    return {
        "email": email.lower(),
        "checked": len(output),
        "found": found[:250],
        "rateLimited": rate_limited,
        "errors": errors,
        "passwordRecoveryModulesDisabled": True,
    }


def run_instagram(username: str) -> dict[str, Any]:
    import instaloader

    username = normalize_username(username, instagram=True)
    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        quiet=True,
        max_connection_attempts=1,
    )

    login = os.getenv("INSTAGRAM_LOGIN")
    session_file = os.getenv("INSTAGRAM_SESSION_FILE")
    if login and session_file:
        loader.load_session_from_file(login, filename=session_file)

    with contextlib.redirect_stdout(sys.stderr):
        profile = instaloader.Profile.from_username(loader.context, username)

    record = {
        "platform": "instagram",
        "username": profile.username,
        "userId": str(profile.userid),
        "fullName": profile.full_name,
        "biography": profile.biography,
        "externalUrl": profile.external_url,
        "followers": profile.followers,
        "followees": profile.followees,
        "mediaCount": profile.mediacount,
        "isPrivate": profile.is_private,
        "isVerified": profile.is_verified,
        "isBusinessAccount": getattr(profile, "is_business_account", None),
        "businessCategory": getattr(profile, "business_category_name", None),
        "profilePicUrl": str(profile.profile_pic_url) if profile.profile_pic_url else None,
        "url": f"https://www.instagram.com/{profile.username}/",
    }
    loader.close()
    return {"username": username, "records": [record]}


async def run_telegram(target: str) -> dict[str, Any]:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    from telethon.tl.functions.channels import GetFullChannelRequest
    from telethon.tl.functions.users import GetFullUserRequest
    from telethon.tl.types import Channel, User

    username = normalize_username(target, telegram=True)
    api_id_raw = os.getenv("TELEGRAM_API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH")
    session = os.getenv("TELEGRAM_SESSION")
    if not api_id_raw or not api_hash or not session:
        raise RuntimeError("telegram_credentials_not_configured")

    client = TelegramClient(StringSession(session), int(api_id_raw), api_hash)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise RuntimeError("telegram_session_not_authorized")

        entity = await client.get_entity(username)
        about = None
        participants_count = getattr(entity, "participants_count", None)
        if isinstance(entity, User):
            full = await client(GetFullUserRequest(entity))
            about = getattr(full.full_user, "about", None)
        elif isinstance(entity, Channel):
            full = await client(GetFullChannelRequest(entity))
            about = getattr(full.full_chat, "about", None)
            participants_count = getattr(full.full_chat, "participants_count", participants_count)

        record = {
            "platform": "telegram",
            "entityType": entity.__class__.__name__,
            "id": str(getattr(entity, "id", "")),
            "username": getattr(entity, "username", None),
            "firstName": getattr(entity, "first_name", None),
            "lastName": getattr(entity, "last_name", None),
            "title": getattr(entity, "title", None),
            "about": about,
            "verified": bool(getattr(entity, "verified", False)),
            "scam": bool(getattr(entity, "scam", False)),
            "fake": bool(getattr(entity, "fake", False)),
            "bot": bool(getattr(entity, "bot", False)),
            "broadcast": bool(getattr(entity, "broadcast", False)),
            "megagroup": bool(getattr(entity, "megagroup", False)),
            "participantsCount": participants_count,
            "url": f"https://t.me/{username}",
        }
        return {"username": username, "records": [record]}
    finally:
        await client.disconnect()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["sherlock", "maigret", "holehe", "instagram", "telegram"])
    parser.add_argument("target")
    args = parser.parse_args()

    try:
        if args.mode == "sherlock":
            result = run_sherlock(args.target)
        elif args.mode == "maigret":
            result = asyncio.run(run_maigret(args.target))
        elif args.mode == "holehe":
            result = run_holehe(args.target)
        elif args.mode == "instagram":
            result = run_instagram(args.target)
        else:
            result = asyncio.run(run_telegram(args.target))
        emit(result)
        return 0
    except Exception as error:
        print(f"[identity-osint-adapter] {type(error).__name__}: {error}", file=sys.stderr)
        emit({"error": str(error), "errorType": type(error).__name__})
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
