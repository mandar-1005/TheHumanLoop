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

def get_next_revision_number(training_id: int) -> int:
    response = (
        supabase.table("training_revisions")
        .select("revision_number")
        .eq("training_id", training_id)
        .order("revision_number", desc=True)
        .limit(1)
        .execute()
    )
    latest = (response.data or [None])[0]
    if not latest:
        return 1
    return int(latest.get("revision_number", 0)) + 1


def create_training_revision(
    training_id: int,
    prior_training_json: str,
    critique_text: str,
    revised_training_json: str,
    created_by: str,
) -> dict | None:
    revision_number = get_next_revision_number(training_id)
    response = (
        supabase.table("training_revisions")
        .insert(
            {
                "training_id": training_id,
                "revision_number": revision_number,
                "prior_training_json": prior_training_json,
                "critique_text": critique_text,
                "revised_training_json": revised_training_json,
                "created_by": str(created_by),
                "accepted": False,
            }
        )
        .execute()
    )
    return (response.data or [None])[0]


def list_training_revisions(training_id: int) -> list[dict]:
    response = (
        supabase.table("training_revisions")
        .select(
            "training_id, revision_number, critique_text, accepted, created_by, created_at"
        )
        .eq("training_id", training_id)
        .order("revision_number", desc=True)
        .execute()
    )
    return response.data or []


def get_training_revision(training_id: int, revision_number: int) -> dict | None:
    response = (
        supabase.table("training_revisions")
        .select("*")
        .eq("training_id", training_id)
        .eq("revision_number", revision_number)
        .limit(1)
        .execute()
    )
    return (response.data or [None])[0]


def mark_revision_accepted(training_id: int, revision_number: int) -> dict | None:
    response = (
        supabase.table("training_revisions")
        .update({"accepted": True})
        .eq("training_id", training_id)
        .eq("revision_number", revision_number)
        .execute()
    )
    return (response.data or [None])[0]


def apply_revision_to_training(training_id: int, revised_training_json: str) -> dict | None:
    response = (
        supabase.table("trainings")
        .update(
            {
                "training_json": revised_training_json,
                "status": "draft",
                "rejection_reason": None,
            }
        )
        .eq("id", training_id)
        .execute()
    )
    return (response.data or [None])[0]