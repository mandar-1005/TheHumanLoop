from dataclasses import dataclass, field
from typing import List


@dataclass
class QuestionGrade:
    question_id: str
    score: float
    selected_answer: str
    answer_key: str
    is_correct: bool
    feedback: str = ""
    strengths: List[str] = field(default_factory=list)
    improvements: List[str] = field(default_factory=list)


@dataclass
class GradeSummary:
    total_questions: int
    total_score: float
    max_score: float
    percentage: float
    details: List[QuestionGrade]

