import json

from app.pipeline.base_agent import BaseAgent

grading_system_prompt = """
You are a FedRAMP compliance grading agent.

Input:
- Assessment prompt
- Grading rubric
- Employee response

Task:
1. Evaluate response against rubric.
2. Provide:
   - Score (0-100)
   - Feedback
   - Strengths
   - Areas for Improvement

Return JSON:
{
  "score": 0,
  "feedback": "",
  "strengths": [],
  "improvements": [],
  "criterion_scores": [
    {
      "criterion": "",
      "weight": 0.0,
      "score": 0,
      "rationale": ""
    }
  ]
}
"""

class GradingAgent(BaseAgent):
    def __init__(self):
        super().__init__(grading_system_prompt)

    def generate_answer_key(self, prompt, rubric="", temperature=0.2):
        key_prompt = f"""
Create an ideal answer key for this assessment question.

Question:
{prompt}

Rubric:
{rubric}

Return STRICT JSON only:
{{
  "answer_key": "ideal answer",
  "key_points": ["point 1", "point 2"]
}}
"""
        raw = self.run(key_prompt, temperature=temperature)
        try:
            return json.loads(raw)
        except Exception:
            return {"answer_key": raw.strip(), "key_points": []}

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

Evaluate against rubric and answer key.
Return STRICT JSON:
{{
  "score": 0,
  "feedback": "",
  "strengths": [],
  "improvements": [],
  "criterion_scores": [
    {{
      "criterion": "",
      "weight": 0.0,
      "score": 0,
      "rationale": ""
    }}
  ]
}}
"""
        raw = self.run(grade_prompt, temperature=temperature)
        try:
            return json.loads(raw)
        except Exception:
            return {
                "score": 0,
                "feedback": raw.strip(),
                "strengths": [],
                "improvements": ["Could not parse model JSON output."],
            }