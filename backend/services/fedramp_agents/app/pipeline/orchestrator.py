import json
import logging

from app.pipeline.ssp_agent import SSPAgent
from app.pipeline.bloom_agent import BloomAgent
from app.pipeline.training_agent import TrainingAgent
from app.pipeline.media_agent import generate_training_images
from app.crud.crud_training import insert_training as _raw_insert

logger = logging.getLogger(__name__)


def generate_training(ssp_text, roles):
    ssp_agent = SSPAgent()
    bloom_agent = BloomAgent()
    training_agent = TrainingAgent()

    role_mapping = ssp_agent.run(
        f"SSP:\n{ssp_text}\n\nRoles:\n{roles}"
    )

    blooms_output = bloom_agent.run(role_mapping)

    training_output = training_agent.run(blooms_output)

    return training_output


def generate_training_with_media(ssp_text, roles, company_id: str) -> dict:
    """Full pipeline: text agents -> insert row -> image generation -> merge media."""
    training_json_str = generate_training(ssp_text, roles)

    role = roles[0] if isinstance(roles, list) and roles else str(roles)

    training_row = _raw_insert(company_id, role, training_json_str)
    training_id = training_row["id"]

    try:
        parsed = json.loads(
            training_json_str
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )
    except (json.JSONDecodeError, AttributeError):
        parsed = {}

    study_guide = ""
    if isinstance(parsed, list) and parsed:
        study_guide = parsed[0].get("study_guide", "")
    elif isinstance(parsed, dict):
        study_guide = parsed.get("study_guide", "")

    media = parsed.get("media", {}) if isinstance(parsed, dict) else {}

    images = []
    if study_guide:
        try:
            images = generate_training_images(study_guide, role, training_id)
        except Exception:
            logger.exception("Image generation failed for training %s", training_id)

    if not isinstance(media, dict):
        media = {}
    media["images"] = images
    media.setdefault("diagrams", [])
    media.setdefault("videos", [])

    if isinstance(parsed, dict):
        parsed["media"] = media
    elif isinstance(parsed, list) and parsed:
        parsed[0]["media"] = media

    from app.database.supabase_client import supabase
    supabase.table("trainings").update(
        {"training_json": json.dumps(parsed)}
    ).eq("id", training_id).execute()

    return {
        "training_row": {**training_row, "training_json": json.dumps(parsed)},
    }
