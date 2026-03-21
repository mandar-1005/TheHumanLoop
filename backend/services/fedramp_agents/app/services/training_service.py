from app.crud.crud_ssp import get_latest_ssp, insert_ssp
from app.crud.crud_training import insert_training
from app.pipeline.orchestrator import generate_training

def create_training_from_uploaded_ssp(role: str, company_id: int, ssp_text: str) -> dict:
    inserted_ssp = insert_ssp(company_id=company_id, content=ssp_text)

    latest_ssp = get_latest_ssp()
    if not latest_ssp:
        raise ValueError("No SSP found in database.")

    latest_company_id = int(latest_ssp.get("company_id", company_id))
    training_output = generate_training(latest_ssp.get("content", ""), [role])

    inserted_training = insert_training(
        company_id=latest_company_id,
        role=role,
        training_json=training_output,
    )

    return {
        "uploaded_ssp_id": inserted_ssp.get("id") if inserted_ssp else None,
        "latest_ssp_id": latest_ssp.get("id"),
        "role": role,
        "training_row": inserted_training,
    }