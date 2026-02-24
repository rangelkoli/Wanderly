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
    """Run a web search"""

    return search.run(query, max_results=max_results, topic=topic, include_raw_content=include_raw_content)