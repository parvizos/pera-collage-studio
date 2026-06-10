"""Free, keyless auto-translation of storefront content (on save).

Strategy: translate each user-facing string into RU/EN/TR/AR using the free
Google Translate endpoint, with MyMemory as a fallback. Results are cached in
``home["translations"]`` so re-saves only translate new/changed text.

No API key required. Network failures degrade gracefully (text stays in its
original language).
"""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

LANGS = ["ru", "en", "tr", "ar"]
# Keys whose string values are user-facing content worth translating.
TEXT_KEYS = {"title", "subtitle", "text", "button", "button2"}

_HAS_LETTER = re.compile(r"[A-Za-zÀ-ɏЀ-ӿ؀-ۿ]")


def _has_letters(s: str) -> bool:
    return bool(_HAS_LETTER.search(s))


def _skip(s: str) -> bool:
    """Skip non-content strings: urls, paths, hex colors, data URIs, icon-only."""
    if not isinstance(s, str):
        return True
    st = s.strip()
    if not st or len(st) > 240:
        return True
    if st.startswith(("http://", "https://", "data:", "/", "#")):
        return True
    if not _has_letters(st):
        return True
    return False


def _google(text: str, tl: str) -> str | None:
    url = (
        "https://translate.googleapis.com/translate_a/single"
        "?client=gtx&sl=auto&tl=%s&dt=t&q=%s" % (tl, urllib.parse.quote(text))
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        out = "".join(seg[0] for seg in data[0] if seg and seg[0])
        return out or None
    except Exception:
        return None


def _mymemory(text: str, tl: str) -> str | None:
    url = (
        "https://api.mymemory.translated.net/get?q=%s&langpair=%s"
        % (urllib.parse.quote(text), urllib.parse.quote("ru|" + tl))
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        out = (data.get("responseData") or {}).get("translatedText")
        if out and "MYMEMORY WARNING" not in out.upper():
            return out
    except Exception:
        pass
    return None


def translate_one(text: str, tl: str) -> str:
    return _google(text, tl) or _mymemory(text, tl) or text


def _collect(node, out: set) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "translations":
                continue
            if key in TEXT_KEYS and isinstance(value, str) and not _skip(value):
                out.add(value)
            else:
                _collect(value, out)
    elif isinstance(node, list):
        for item in node:
            _collect(item, out)


def needs_translation(home: dict) -> bool:
    """True if any user-facing string is missing a translation for some language."""
    if not isinstance(home, dict):
        return False
    strings: set[str] = set()
    _collect(home, strings)
    existing = home.get("translations")
    existing = existing if isinstance(existing, dict) else {}
    for src in strings:
        cur = existing.get(src)
        cur = cur if isinstance(cur, dict) else {}
        for lang in LANGS:
            if not cur.get(lang):
                return True
    return False


def enrich_home_translations(home: dict, max_new_strings: int = 100) -> dict:
    """Translate every new user-facing string in ``home`` into the 4 languages.

    Caches into ``home['translations']`` = { source_text: {ru,en,tr,ar} }.
    """
    if not isinstance(home, dict):
        return home

    existing = home.get("translations")
    if not isinstance(existing, dict):
        existing = {}

    strings: set[str] = set()
    _collect(home, strings)

    tasks: list[tuple[str, str]] = []
    for src in strings:
        cur = existing.get(src)
        cur = cur if isinstance(cur, dict) else {}
        for lang in LANGS:
            if not cur.get(lang):
                tasks.append((src, lang))

    if not tasks:
        home["translations"] = existing
        return home

    tasks = tasks[: max_new_strings * len(LANGS)]

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(translate_one, src, lang): (src, lang) for src, lang in tasks}
        for fut in as_completed(futures):
            src, lang = futures[fut]
            try:
                value = fut.result()
            except Exception:
                value = src
            if not isinstance(existing.get(src), dict):
                existing[src] = {}
            existing[src][lang] = value

    home["translations"] = existing
    return home
