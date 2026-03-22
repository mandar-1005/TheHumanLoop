from pydantic import BaseModel

class TrainingCreateInput(BaseModel):
    role: str
    company_id: str
    ssp_text: str
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class CriterionScore:
    criterion: str
    weight: float
    score: float
    rationale: str = ""


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
    criterion_scores: List[CriterionScore] = field(default_factory=list)
    rubric: Optional[Dict[str, Any]] = field(default=None)


@dataclass
class GradeSummary:
    total_questions: int
    total_score: float
    max_score: float
    percentage: float
    details: List[QuestionGrade]
