import json
from typing import List, Optional

from langgraph.types import interrupt
from typing_extensions import TypedDict


class PlaceOption(TypedDict, total=False):
    id: str
    name: str
    description: str
    image_url: str
    area: str


def select_places(
    places: List[PlaceOption],
    prompt: str = "Select the places you want included in the itinerary.",
    min_select: int = 1,
    max_select: Optional[int] = None,
) -> str:
    """Show candidate places to the user and let them choose what to include."""
    normalized: List[PlaceOption] = []
    for idx, place in enumerate(places or []):
        name = (place.get("name") or "").strip()
        if not name:
            continue
        normalized.append(
            {
                "id": place.get("id") or f"place_{idx + 1}",
                "name": name,
                "description": (place.get("description") or "").strip(),
                "image_url": (place.get("image_url") or "").strip(),
                "area": (place.get("area") or "").strip(),
            }
        )

    if not normalized:
        raise ValueError("select_places requires at least one valid place option.")

    answer = interrupt(
        {
            "type": "select_places",
            "prompt": prompt,
            "places": normalized,
            "min_select": max(0, min_select),
            "max_select": max_select if max_select is None else max(1, max_select),
        }
    )

    if isinstance(answer, dict):
        return json.dumps(answer)
    if isinstance(answer, list):
        return json.dumps({"selected_places": answer})
    return json.dumps({"selected_places": [str(answer)]})
