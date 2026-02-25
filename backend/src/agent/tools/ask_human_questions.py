import json
from typing import List, Optional
from langgraph.types import interrupt
from typing_extensions import TypedDict


class AskHumanQuestion(TypedDict, total=False):
    id: str
    question: str
    choices: List[str]


def ask_human(
    question: Optional[str] = None,
    choices: Optional[List[str]] = None,
    questions: Optional[List[AskHumanQuestion]] = None,
) -> str:
    """Ask one or more clarifying questions and wait for the human answers."""
    normalized_questions: List[AskHumanQuestion] = []

    if questions:
        for idx, q in enumerate(questions):
            q_text = (q.get("question") or "").strip()
            if not q_text:
                continue
            normalized_questions.append(
                {
                    "id": q.get("id") or f"q{idx + 1}",
                    "question": q_text,
                    "choices": list(q.get("choices") or []),
                }
            )
    elif question and question.strip():
        normalized_questions.append(
            {
                "id": "q1",
                "question": question.strip(),
                "choices": list(choices or []),
            }
        )
    else:
        raise ValueError("ask_human requires either `question` or `questions`.")

    payload = (
        {"question": normalized_questions[0]["question"], "choices": normalized_questions[0]["choices"]}
        if len(normalized_questions) == 1
        else {"questions": normalized_questions}
    )

    answer = interrupt(payload)

    if len(normalized_questions) == 1:
        if isinstance(answer, str):
            return answer
        if isinstance(answer, dict):
            answers = answer.get("answers")
            if isinstance(answers, list) and answers:
                first = answers[0]
                if isinstance(first, dict) and isinstance(first.get("answer"), str):
                    return first["answer"]
            if isinstance(answer.get("answer"), str):
                return answer["answer"]
        return str(answer)

    # For multi-question responses, return a JSON string so the LLM can inspect all answers.
    if isinstance(answer, dict):
        return json.dumps(answer)

    if isinstance(answer, list):
        return json.dumps({"answers": answer})

    return json.dumps({"answers": [{"id": "q1", "answer": str(answer)}]})
