import json
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.crud.crud_training import get_training_by_id
from app.database.supabase_client import supabase

router = APIRouter(prefix="/api/trainings", tags=["media"])

BUCKET = "training-media"


def _parse_training_json(raw) -> dict | list:
    if isinstance(raw, str):
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)
    return raw


def _get_content(parsed):
    if isinstance(parsed, list) and parsed:
        return parsed[0]
    if isinstance(parsed, dict):
        return parsed
    return {}


@router.post("/{training_id}/media")
async def upload_media(
    training_id: int,
    file: UploadFile = File(...),
    caption: str = Form(""),
    section_ref: str = Form(""),
):
    training = get_training_by_id(training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    media_id = f"upload_{uuid.uuid4().hex[:8]}"
    ext = (file.filename or "file").rsplit(".", 1)[-1] if file.filename else "bin"
    storage_path = f"{training_id}/{media_id}.{ext}"

    content_type = file.content_type or "application/octet-stream"
    supabase.storage.from_(BUCKET).upload(
        storage_path,
        file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    url = supabase.storage.from_(BUCKET).get_public_url(storage_path)

    parsed = _parse_training_json(training.get("training_json"))
    content = _get_content(parsed)
    media = content.setdefault("media", {})
    images = media.setdefault("images", [])

    images.append({
        "id": media_id,
        "storage_path": storage_path,
        "url": url,
        "alt": caption or f"Uploaded media for training {training_id}",
        "caption": caption,
        "section_ref": section_ref,
    })

    supabase.table("trainings").update(
        {"training_json": json.dumps(parsed)}
    ).eq("id", training_id).execute()

    return {"success": True, "media_id": media_id, "url": url}


@router.delete("/{training_id}/media/{media_id}")
async def delete_media(training_id: int, media_id: str):
    training = get_training_by_id(training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    parsed = _parse_training_json(training.get("training_json"))
    content = _get_content(parsed)
    media = content.get("media", {})
    images = media.get("images", [])

    target = next((img for img in images if img.get("id") == media_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Media item not found")

    storage_path = target.get("storage_path", "")
    if storage_path:
        try:
            supabase.storage.from_(BUCKET).remove([storage_path])
        except Exception:
            pass

    media["images"] = [img for img in images if img.get("id") != media_id]

    supabase.table("trainings").update(
        {"training_json": json.dumps(parsed)}
    ).eq("id", training_id).execute()

    return {"success": True, "deleted": media_id}
