import logging

from google.genai import types

from app.database.supabase_client import supabase
from app.pipeline.base_agent import get_genai_client

logger = logging.getLogger(__name__)

BUCKET = "training-media"


def _upload_image_to_storage(image_bytes: bytes, training_id: int, image_id: str) -> str:
    path = f"{training_id}/{image_id}.png"
    supabase.storage.from_(BUCKET).upload(
        path,
        image_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )
    return path


def _build_prompts_from_study_guide(study_guide: str, role: str) -> list[dict]:
    """Extract major sections from the study guide and build image prompts."""
    sections = []
    current_heading = ""
    for line in study_guide.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## "):
            current_heading = stripped.replace("## ", "").strip()
        elif stripped.startswith("### ") and not current_heading:
            current_heading = stripped.replace("### ", "").strip()

        if current_heading and current_heading not in [s["heading"] for s in sections]:
            sections.append({"heading": current_heading})

    prompts = []
    for i, section in enumerate(sections[:3]):
        prompts.append({
            "id": f"img{i + 1}",
            "section_ref": section["heading"],
            "prompt": (
                f"A clean, professional infographic illustration for a FedRAMP security training module. "
                f"Topic: '{section['heading']}' for the role of {role}. "
                f"Use a modern flat design with a blue and white color scheme. "
                f"Include relevant security icons and simple diagrams. "
                f"No text in the image. White background."
            ),
        })
    return prompts


def generate_training_images(study_guide: str, role: str, training_id: int) -> list[dict]:
    """Generate images for training content and upload to Supabase Storage.

    Returns a list of media image dicts ready for training_json.media.images.
    """
    client = get_genai_client()
    prompts = _build_prompts_from_study_guide(study_guide, role)
    images = []

    for p in prompts:
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=p["prompt"],
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                ),
            )

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    image_bytes = part.inline_data.data
                    storage_path = _upload_image_to_storage(image_bytes, training_id, p["id"])
                    url = supabase.storage.from_(BUCKET).get_public_url(storage_path)
                    images.append({
                        "id": p["id"],
                        "storage_path": storage_path,
                        "url": url,
                        "alt": f"Illustration for {p['section_ref']}",
                        "caption": f"Visual overview: {p['section_ref']}",
                        "section_ref": p["section_ref"],
                    })
                    break
        except Exception:
            logger.exception("Image generation failed for prompt %s", p["id"])

    return images
