from fastapi import APIRouter, HTTPException

from app.crud.crud_training import (
    get_profile_role,
    get_training_by_id,
    get_trainings_by_status,
    list_training_revisions,
    update_training_status,
    VALID_TRANSITIONS,
)
from app.schemas.training import (
    AcceptRevisionRequest,
    RegenerateTrainingRequest,
    ReviewAction,
)
from app.services.training_service import (
    accept_training_revision,
    regenerate_training_with_critique,
)

router = APIRouter(prefix="/api/trainings", tags=["review"])


def _transition(training_id: int, target_status: str, require_admin_user_id: str | None = None, rejection_reason: str | None = None):
    training = get_training_by_id(training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    current = training.get("status", "draft")
    allowed = VALID_TRANSITIONS.get(current, ())
    if target_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current}' to '{target_status}'",
        )

    if require_admin_user_id:
        role = get_profile_role(require_admin_user_id)
        if role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    updated = update_training_status(training_id, target_status, rejection_reason)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update training status")
    return {"success": True, "training": updated}


@router.post("/{training_id}/submit-review")
def submit_for_review(training_id: int):
    """Move a draft training into the review queue."""
    return _transition(training_id, "in_review")


@router.post("/{training_id}/approve")
def approve_training(training_id: int, user_id: str | None = None):
    """Approve a training that is in review (admin only)."""
    return _transition(training_id, "published", require_admin_user_id=user_id)


@router.post("/{training_id}/reject")
def reject_training(training_id: int, body: ReviewAction | None = None, user_id: str | None = None):
    """Reject a training that is in review (admin only)."""
    reason = body.rejection_reason if body else None
    return _transition(training_id, "rejected", require_admin_user_id=user_id, rejection_reason=reason)


@router.get("/review-queue")
def get_review_queue():
    """Return all trainings currently in review."""
    trainings = get_trainings_by_status("in_review")
    return {"trainings": trainings}


@router.post("/{training_id}/regenerate")
def regenerate_training(training_id: int, body: RegenerateTrainingRequest):
    """Regenerate a draft/rejected training using human critique (admin only)."""
    role = get_profile_role(str(body.user_id))
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    training = get_training_by_id(training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    status = training.get("status", "draft")
    if status == "published":
        raise HTTPException(
            status_code=400,
            detail="Published training cannot be regenerated. Move it back to draft/in_review first.",
        )

    try:
        result = regenerate_training_with_critique(
            training_id=training_id,
            critique_text=body.critique_text,
            user_id=str(body.user_id),
            temperature=body.temperature,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"success": True, **result}


@router.get("/{training_id}/revisions")
def get_training_revisions(training_id: int):
    """List saved critique/revision entries for a training."""
    training = get_training_by_id(training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    return {"training_id": training_id, "revisions": list_training_revisions(training_id)}


@router.post("/{training_id}/accept-revision")
def accept_revision(training_id: int, body: AcceptRevisionRequest):
    """Accept one revision and apply it to the canonical training row (admin only)."""
    role = get_profile_role(str(body.user_id))
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    training = get_training_by_id(training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    try:
        result = accept_training_revision(
            training_id=training_id,
            revision_number=body.revision_number,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"success": True, **result}