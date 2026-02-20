from typing import List, Optional, Any
from langgraph.types import interrupt
from typing_extensions import TypedDict


def ask_human(question: str, choices: List[str]) -> str:
    """Ask the human a clarifying question and wait for their answer."""
    # The LLM's chosen question is passed here as `question`
    # interrupt() pauses the graph and surfaces it to the caller
    answer = interrupt({"question": question, "choices": choices})
    return answer  # returned as the ToolMessage content back to the LLM