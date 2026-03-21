from app.database.supabase_client import supabase

def insert_ssp(company_id: int, content: str) -> dict | None:
    cleaned_content = content.replace("\x00", "")
    response = (
        supabase.table("ssps")
        .insert({"company_id": company_id, "content": cleaned_content})
        .execute()
    )
    return (response.data or [None])[0]


def get_latest_ssp() -> dict | None:
    response = (
        supabase.table("ssps")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return (response.data or [None])[0]