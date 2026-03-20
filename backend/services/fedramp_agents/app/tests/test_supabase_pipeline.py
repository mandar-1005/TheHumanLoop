from app.database.supabase_client import supabase
from app.pipeline.orchestrator import generate_training


def run_pipeline_for_latest_ssp(role: str):
    # Fetch latest SSP
    ssp_response = (
        supabase.table("ssps")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not ssp_response.data:
        raise Exception("No SSP found in database.")

    latest_ssp = ssp_response.data[0]
    ssp_text = latest_ssp["content"]

    # Run Agent Pipeline for one role
    training_output = generate_training(ssp_text, [role])

    # Store training in Supabase
    insert_response = (
        supabase.table("trainings")
        .insert(
            {
                "company_id": latest_ssp["company_id"],
                "company_role": role,
                "training_json": training_output,
            }
        )
        .execute()
    )

    return {
        "latest_ssp_id": latest_ssp.get("id"),
        "company_id": latest_ssp.get("company_id"),
        "role": role,
        "training_row": insert_response.data[0] if insert_response.data else None,
    }


if __name__ == "__main__":
    result = run_pipeline_for_latest_ssp("Software Developer")
    print("\nTraining generated and stored successfully.\n")
    print(result)