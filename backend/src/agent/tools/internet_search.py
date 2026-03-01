import json
import os
from typing import Literal

from langchain_community.tools import DuckDuckGoSearchResults
from tavily import TavilyClient

def _get_tavily_client() -> TavilyClient | None:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return None
    return TavilyClient(api_key=api_key)


def _get_duckduckgo_search() -> DuckDuckGoSearchResults:
    return DuckDuckGoSearchResults()

def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
):
    """Run a web search and return structured JSON with image candidates."""

    normalized_max = max(1, min(max_results, 10))

    tavily_client = _get_tavily_client()
    if tavily_client is not None:
        try:
            tavily_response = tavily_client.search(
                query=query,
                topic=topic,
                max_results=normalized_max,
                include_images=True,
                include_raw_content=include_raw_content,
            )

            results = []
            for row in tavily_response.get("results", [])[:normalized_max]:
                results.append(
                    {
                        "title": row.get("title"),
                        "url": row.get("url"),
                        "content": row.get("content"),
                        "score": row.get("score"),
                        "image_url": row.get("image_url") or row.get("favicon"),
                    }
                )

            payload = {
                "query": query,
                "provider": "tavily",
                "results": results,
                "image_candidates": tavily_response.get("images", [])[:20],
            }
            return json.dumps(payload)
        except Exception:
            pass

    fallback_text = _get_duckduckgo_search().run(
        query,
        max_results=normalized_max,
        topic=topic,
        include_raw_content=include_raw_content,
    )

    fallback_payload = {
        "query": query,
        "provider": "duckduckgo",
        "results_text": fallback_text,
        "image_candidates": [],
    }
    return json.dumps(fallback_payload)
