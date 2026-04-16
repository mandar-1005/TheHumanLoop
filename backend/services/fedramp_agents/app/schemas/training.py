from typing import Any, List, Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CreateTrainingResponse(BaseModel):
    success: bool
    message: str
    result: dict[str, Any]


BLOOM_LEVELS = (
    "Remembering", "Understanding", "Applying",
    "Analyzing", "Evaluating", "Creating",
)

ASSESSMENT_FORMATS = (
    "flashcard", "multiple_choice", "short_response",
    "case_study", "evaluation", "open_ended",
)

class RegenerateTrainingRequest(BaseModel):
    user_id: UUID
    critique_text: str = Field(min_length=3, max_length=4000)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)


class AcceptRevisionRequest(BaseModel):
    user_id: UUID
    revision_number: int = Field(ge=1)

class AssessmentQuestion(BaseModel):
    question_id: str
    prompt: str = ""
    role: str = "developer"
    question_type: str = Field(
        default="multiple_choice",
        description="One of: multiple_choice, descriptive, flashcard, short_response, case_study, evaluation, open_ended",
    )
    bloom_level: Optional[str] = Field(
        default=None,
        description="Bloom's taxonomy level: Remembering, Understanding, Applying, Analyzing, Evaluating, Creating",
    )
    rubric: Optional[str] = ""
    options: List[str] = Field(default_factory=list)
    correct_answer: Optional[str] = None
    answer_key: Optional[str] = None


class SelectedAnswer(BaseModel):
    question_id: str
    answer: str


class GradeAssessmentRequest(BaseModel):
    questions: List[AssessmentQuestion]
    selected_answers: List[SelectedAnswer]
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)


class RegradeRequest(BaseModel):
    question: AssessmentQuestion
    selected_answer: str
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class TrainingFeedbackRequest(BaseModel):
    training_id: int
    user_id: UUID
    positive_score: Literal[-1, 1]


class ReviewAction(BaseModel):
    rejection_reason: Optional[str] = None
