from fastapi import APIRouter, HTTPException

from app.schemas.training import GradeAssessmentRequest, RegradeRequest
from app.services.grading_service import grade_assessment_payload, regrade_payload
import logging


router = APIRouter(prefix="/grading", tags=["grading"])
logger = logging.getLogger(__name__)


@router.post("/grade")
def grade_assessment(payload: GradeAssessmentRequest):
    if not payload.questions:
        raise HTTPException(status_code=400, detail="questions cannot be empty")
    return grade_assessment_payload(payload, logger)


@router.post("/regrade")
def regrade_with_temperature(payload: RegradeRequest):
    question = payload.question
    answer_key = question.answer_key or question.correct_answer
    if question.question_type == "multiple_choice" and not answer_key:
        raise HTTPException(
            status_code=400,
            detail="answer_key or correct_answer required for multiple_choice regrade",
        )
    return regrade_payload(payload)