import json
from typing import Literal
import os
from langchain_community.tools import DuckDuckGoSearchResults

from tavily import TavilyClient

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
search = DuckDuckGoSearchResults()

def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
):
    """Run a web search and return structured JSON with image candidates."""

    normalized_max = max(1, min(max_results, 10))

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
        fallback_text = search.run(
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
