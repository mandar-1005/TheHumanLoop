import json
import re

from app.pipeline.base_agent import BaseAgent

grading_system_prompt = """
You are a fair and encouraging FedRAMP compliance grading agent.

Input:
- Assessment prompt (the question the employee answered)
- Grading rubric (with weighted criteria)
- AI-generated answer key (the ideal answer for reference)
- Employee response (what the employee submitted)

GRADING GUIDELINES:
- Be fair and constructive. Recognize partial understanding and effort.
- Score on an INTEGER scale from 0 to 100 (NOT 0 to 1, NOT decimals like 0.75).
  - 90-100: Excellent, comprehensive response covering all key points
  - 70-89: Good response, covers most key points with minor gaps
  - 50-69: Adequate response, demonstrates basic understanding but missing details
  - 30-49: Below expectations, only partially addresses the question
  - 0-29: Minimal effort or largely incorrect
- If the employee demonstrates understanding of the core concepts, even if wording differs from the answer key, give credit.
- A reasonable answer that addresses the main points should score at least 60-70.

SCORING RULES:
- "score" field: INTEGER between 0 and 100 (e.g. 75, NOT 0.75)
- "criterion_scores[].score": INTEGER between 0 and 100 (e.g. 80, NOT 0.80)
- "criterion_scores[].weight": DECIMAL matching the rubric (e.g. 0.35)

Return STRICT JSON (no markdown fences, no extra text):
{
  "score": 75,
  "feedback": "constructive overall feedback",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "criterion_scores": [
    {
      "criterion": "criterion name from rubric",
      "weight": 0.35,
      "score": 75,
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

AI-generated answer key (reference, not the only valid answer):
{answer_key}

Employee response:
{employee_response}

Instructions:
- Score EACH criterion listed in the rubric as an INTEGER from 0 to 100.
- Copy the exact criterion names and weights from the rubric into criterion_scores.
- Be fair: if the employee shows understanding of the concepts, even with different wording, give credit.
- A reasonable answer covering the main points should score 60-80 per criterion.
- The overall "score" should be an INTEGER from 0 to 100.
- DO NOT use decimal scores like 0.75. Use integers like 75.

Return STRICT JSON (no markdown fences):
{{
  "score": 75,
  "feedback": "constructive feedback here",
  "strengths": ["specific strength"],
  "improvements": ["specific improvement area"],
  "criterion_scores": [
    {{
      "criterion": "criterion name",
      "weight": 0.35,
      "score": 75,
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
