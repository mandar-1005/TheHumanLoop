from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.training import CreateTrainingResponse
from app.services.training_service import create_training_from_uploaded_ssp

router = APIRouter(prefix="/api/trainings", tags=["trainings"])

def sanitize_text(value: str) -> str:
    return value.replace("\x00", "").strip()

@router.post("/create", response_model=CreateTrainingResponse)
async def create_training_endpoint(
    role: str = Form(...),
    company_id: str = Form(...),
    ssp_file: UploadFile = File(...),
):
    normalized_role = role.strip()
    if not normalized_role:
        raise HTTPException(status_code=400, detail="Role is required.")

    raw_data = await ssp_file.read()
    if not raw_data:
        raise HTTPException(status_code=400, detail="SSP file is empty.")

    ssp_text = sanitize_text(raw_data.decode("utf-8", errors="ignore"))
    if not ssp_text:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from SSP file.",
        )

    try:
        result = create_training_from_uploaded_ssp(
            role=normalized_role,
            company_id=company_id,
            ssp_text=ssp_text,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return CreateTrainingResponse(
        success=True,
        message="Training added to Training Modules.",
        result=result,
    )