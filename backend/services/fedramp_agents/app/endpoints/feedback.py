from fastapi import APIRouter, HTTPException

from app.crud.crud_training import get_profile_role, update_training_positive_score
from app.schemas.training import TrainingFeedbackRequest


router = APIRouter(tags=["feedback"])


@router.post("/api/feedback")
def submit_training_feedback(payload: TrainingFeedbackRequest):
    role = get_profile_role(payload.user_id)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    updated_training = update_training_positive_score(
        training_id=payload.training_id,
        delta=payload.positive_score,
    )
    if not updated_training:
        raise HTTPException(status_code=404, detail="Training not found")

    return {
        "success": True,
        "training_id": updated_training.get("id", payload.training_id),
        "positive_score": updated_training.get("positive_score", 0),
    }