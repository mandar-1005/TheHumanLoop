from app.crud.crud_ssp import get_latest_ssp, insert_ssp
from app.crud.crud_training import (
    apply_revision_to_training,
    create_training_revision,
    get_training_by_id,
    get_training_revision,
    mark_revision_accepted,
)
from app.pipeline.orchestrator import generate_training_with_media
from app.pipeline.orchestrator import regenerate_training_from_critique

def create_training_from_uploaded_ssp(role: str, company_id: str, ssp_text: str) -> dict:
    inserted_ssp = insert_ssp(company_id=company_id, content=ssp_text)

    latest_ssp = get_latest_ssp()
    if not latest_ssp:
        raise ValueError("No SSP found in database.")

    latest_company_id = latest_ssp.get("company_id", company_id)
    result = generate_training_with_media(
        latest_ssp.get("content", ""),
        [role],
        company_id=latest_company_id,
    )

    return {
        "uploaded_ssp_id": inserted_ssp.get("id") if inserted_ssp else None,
        "latest_ssp_id": latest_ssp.get("id"),
        "role": role,
        "training_row": result.get("training_row"),
    }

def regenerate_training_with_critique(
    training_id: int,
    critique_text: str,
    user_id: str,
    temperature: float = 0.2,
) -> dict:
    training = get_training_by_id(training_id)
    if not training:
        raise ValueError("Training not found")

    role = training.get("company_role") or "Other"
    previous_training_json = training.get("training_json") or "{}"

    regenerated_json = regenerate_training_from_critique(
        previous_training_json=str(previous_training_json),
        role=str(role),
        critique_text=critique_text,
        temperature=temperature,
    )

    revision = create_training_revision(
        training_id=training_id,
        prior_training_json=str(previous_training_json),
        critique_text=critique_text,
        revised_training_json=str(regenerated_json),
        created_by=str(user_id),
    )
    if not revision:
        raise ValueError("Failed to persist training revision")

    return {
        "training_id": training_id,
        "revision": revision,
        "revised_training_json": regenerated_json,
    }


def accept_training_revision(training_id: int, revision_number: int) -> dict:
    revision = get_training_revision(training_id, revision_number)
    if not revision:
        raise ValueError("Revision not found")

    updated_training = apply_revision_to_training(
        training_id=training_id,
        revised_training_json=revision.get("revised_training_json") or "{}",
    )
    if not updated_training:
        raise ValueError("Failed to apply revision to training")

    mark_revision_accepted(training_id, revision_number)

    return {
        "training": updated_training,
        "accepted_revision_number": revision_number,
    }