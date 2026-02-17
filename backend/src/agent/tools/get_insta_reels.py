#!/usr/bin/env python3
# ig_keyword_reels.py
import argparse
import asyncio
import re
import sys
import time
from urllib.parse import quote_plus

from playwright.async_api import async_playwright

RE_MEDIA = re.compile(r"^/(p|reel)/([^/]+)/?$", re.I)
RE_CANONICAL = re.compile(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', re.I)

def die(msg: str, code: int = 2) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)

def normalize(url: str) -> str:
    return url.split("?", 1)[0].rstrip("/") + "/"

def abs_ig(path_or_url: str) -> str:
    if path_or_url.startswith("http"):
        return path_or_url
    return "https://www.instagram.com" + path_or_url

def resolve_to_reel(context, shortcode: str) -> str | None:
    # Preferred format for reels is /reel/<shortcode>/ [web:76]
    reel_url = f"https://www.instagram.com/reel/{shortcode}/"
    r1 = context.request.get(reel_url)
    if r1.status == 200:
        return normalize(reel_url)

    # Fallback: open the /p/ page and read canonical URL
    post_url = f"https://www.instagram.com/p/{shortcode}/"
    r2 = context.request.get(post_url)
    if r2.status != 200:
        return None
    html = r2.text()
    m = RE_CANONICAL.search(html)
    if not m:
        return None
    canonical = normalize(m.group(1))
    if "/reel/" in canonical:
        return canonical
    return None

async def get_reels_for_keyword(
    keyword: str,
    max_urls: int = 10,
    state: str = "state.json",
    headful: bool = False,
    scrolls: int = 50,
    delay: float = 0.8,
) -> list[str]:
    if not (1 <= max_urls <= 10):
        die("max_urls must be between 1 and 10")

    keyword_url = f"https://www.instagram.com/explore/search/keyword/?q={quote_plus(keyword)}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not headful)
        context = await browser.new_context(storage_state=state)
        page = await context.new_page()

        await page.goto(keyword_url, wait_until="domcontentloaded")

        shortcodes = []
        seen_codes = set()

        for _ in range(scrolls):
            hrefs = await page.eval_on_selector_all(
                "a[href]",
                "els => els.map(e => e.getAttribute('href')).filter(Boolean)",
            )
            for h in hrefs:
                m = RE_MEDIA.match(h)
                if not m:
                    continue
                code = m.group(2)
                if code in seen_codes:
                    continue
                seen_codes.add(code)
                shortcodes.append(code)

            await page.mouse.wheel(0, 3000)
            await asyncio.sleep(delay)

            if len(shortcodes) >= max_urls * 6:
                break

        out = []
        seen_urls = set()

        for code in shortcodes:
            reel = resolve_to_reel(context, code)
            if not reel:
                continue
            reel = normalize(reel)
            if reel in seen_urls:
                continue
            seen_urls.add(reel)
            out.append(reel)
            if len(out) >= max_urls:
                break

        await browser.close()
        return out


async def get_insta_reels(
    keyword: str,
    max_urls: int = 5,
    state: str = "state.json",
    scrolls: int = 50,
    delay: float = 0.8,
) -> list[str]:
    """Get Instagram Reel URLs for a keyword search."""
    return await get_reels_for_keyword(
        keyword=keyword,
        max_urls=max_urls,
        state=state,
        headful=False,
        scrolls=scrolls,
        delay=delay,
    )


