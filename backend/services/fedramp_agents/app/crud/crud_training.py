from app.database.supabase_client import supabase


def insert_training(company_id: str, role: str, training_json: str) -> dict | None:
    response = (
        supabase.table("trainings")
        .insert(
            {
                "company_id": company_id,
                "company_role": role,
                "training_json": training_json,
            }
        )
        .execute()
    )
    return (response.data or [None])[0]