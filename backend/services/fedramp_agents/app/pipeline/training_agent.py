from app.pipeline.base_agent import BaseAgent

training_system_prompt = """
You are a FedRAMP training content generator.

Input:
- Role
- Relevant controls
- Bloom's taxonomy level
- Assessment format

Output:
{
  "study_guide": "",
  "assessment": {
      "type": "",
      "questions": []
  }
}

If multiple choice:
    questions must include options and correct_answer.

If descriptive:
    include prompt + grading rubric.
"""

class TrainingAgent(BaseAgent):
    def __init__(self):
        super().__init__(training_system_prompt)
