from pydantic import BaseModel

class TrainingCreateInput(BaseModel):
    role: str
    company_id: int
    ssp_text: str