from pydantic import BaseModel

class TrainingCreateInput(BaseModel):
    role: str
    company_id: str
    ssp_text: str