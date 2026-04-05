from app.database.supabase_client import supabase

VALID_STATUSES = ("draft", "in_review", "published", "rejected")
VALID_TRANSITIONS = {
    "draft": ("in_review",),
    "in_review": ("published", "rejected"),
    "rejected": ("draft", "in_review"),
    "published": (),
}


def insert_training(company_id: str, role: str, training_json: str) -> dict | None:
    response = (
        supabase.table("trainings")
        .insert(
            {
                "company_id": company_id,
                "company_role": role,
                "training_json": training_json,
                "status": "draft",
            }
        )
        .execute()
    )
    return (response.data or [None])[0]


def get_training_by_id(training_id: int) -> dict | None:
    response = (
        supabase.table("trainings")
        .select("*")
        .eq("id", training_id)
        .limit(1)
        .execute()
    )
    return (response.data or [None])[0]


def update_training_status(
    training_id: int, new_status: str, rejection_reason: str | None = None,
) -> dict | None:
    payload: dict = {"status": new_status}
    if new_status == "rejected" and rejection_reason:
        payload["rejection_reason"] = rejection_reason
    if new_status != "rejected":
        payload["rejection_reason"] = None

    response = (
        supabase.table("trainings")
        .update(payload)
        .eq("id", training_id)
        .execute()
    )
    return (response.data or [None])[0]


def get_trainings_by_status(status: str) -> list[dict]:
    response = (
        supabase.table("trainings")
        .select("*")
        .eq("status", status)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def get_profile_role(user_id: str) -> str | None:
    response = (
        supabase.table("profiles")
        .select("role")
        .eq("id", str(user_id))
        .limit(1)
        .execute()
    )
    profile = (response.data or [None])[0]
    if not profile:
        return None
    return profile.get("role")


def update_training_positive_score(training_id: int, delta: int) -> dict | None:
    lookup_response = (
        supabase.table("trainings")
        .select("id, positive_score")
        .eq("id", training_id)
        .limit(1)
        .execute()
    )
    training = (lookup_response.data or [None])[0]
    if not training:
        return None

    current_score = int(training.get("positive_score") or 0)
    new_score = current_score + delta

    update_response = (
        supabase.table("trainings")
        .update({"positive_score": new_score})
        .eq("id", training_id)
        .execute()
    )

    updated_training = (update_response.data or [None])[0]
    if updated_training:
        return updated_training

    training["positive_score"] = new_score
    return training
