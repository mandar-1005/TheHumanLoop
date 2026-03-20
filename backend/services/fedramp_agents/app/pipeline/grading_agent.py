import json
import re

from app.pipeline.base_agent import BaseAgent

grading_system_prompt = """
You are a FedRAMP compliance grading agent.

Input:
- Assessment prompt
- Grading rubric (with weighted criteria)
- Employee response

Task:
1. Score EACH criterion from the rubric individually (0-100).
2. Provide overall feedback, strengths, and areas for improvement.
3. The "score" field should be your overall impression (0-100), but the
   backend will recompute it from criterion_scores using the rubric weights
   for consistency.

Return STRICT JSON (no markdown fences, no extra text):
{
  "score": 0,
  "feedback": "",
  "strengths": [],
  "improvements": [],
  "criterion_scores": [
    {
      "criterion": "criterion name from rubric",
      "weight": 0.0,
      "score": 0,
      "rationale": "why this score"
    }
  ]
}
"""


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _safe_parse_json(raw: str, fallback_keys: dict) -> dict:
    cleaned = _strip_json_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return fallback_keys


class GradingAgent(BaseAgent):
    def __init__(self):
        super().__init__(grading_system_prompt)

    def generate_answer_key(self, prompt, rubric="", temperature=0.2):
        key_prompt = f"""
Create an ideal answer key for this FedRAMP assessment question.

Question:
{prompt}

Rubric:
{rubric}

Return STRICT JSON only (no markdown fences):
{{
  "answer_key": "the ideal complete answer",
  "key_points": ["point 1", "point 2", "point 3"]
}}
"""
        raw = self.run(key_prompt, temperature=temperature)
        return _safe_parse_json(raw, {"answer_key": raw.strip(), "key_points": []})

    def grade_response(
        self,
        assessment_prompt,
        employee_response,
        rubric="",
        answer_key="",
        temperature=0.2,
    ):
        grade_prompt = f"""
Assessment prompt:
{assessment_prompt}

Rubric:
{rubric}

AI-generated answer key:
{answer_key}

Employee response:
{employee_response}

Instructions:
- Score EACH criterion listed in the rubric individually (0-100).
- Populate criterion_scores with the exact criterion names and weights from the rubric.
- Provide overall feedback, strengths, and improvements.

Return STRICT JSON (no markdown fences):
{{
  "score": 0,
  "feedback": "",
  "strengths": [],
  "improvements": [],
  "criterion_scores": [
    {{
      "criterion": "criterion name",
      "weight": 0.0,
      "score": 0,
      "rationale": "brief justification"
    }}
  ]
}}
"""
        raw = self.run(grade_prompt, temperature=temperature)
        return _safe_parse_json(
            raw,
            {
                "score": 0,
                "feedback": raw.strip(),
                "strengths": [],
                "improvements": ["Could not parse model JSON output."],
                "criterion_scores": [],
            },
        )
