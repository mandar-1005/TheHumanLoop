from typing import List, Optional

from pydantic import BaseModel, Field


class AssessmentQuestion(BaseModel):
    question_id: str
    prompt: str
    role: str = "developer"
    question_type: str = Field(
        default="multiple_choice",
        description="multiple_choice | descriptive",
    )
    bloom_level: Optional[str] = Field(
        default=None,
        description="Bloom's taxonomy level assigned by the BloomAgent",
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
