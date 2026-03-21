from typing import Any
from pydantic import BaseModel


class CreateTrainingResponse(BaseModel):
    success: bool
    message: str
    result: dict[str, Any]