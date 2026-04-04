from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.endpoints.feedback import router as feedback_router
from app.endpoints.grading import router as grading_router
from app.endpoints.system import router as system_router
from app.endpoints.trainings import router as trainings_router

app = FastAPI(title="FedRAMP Agents Service")
app.include_router(trainings_router)
app.include_router(grading_router)
app.include_router(feedback_router)
app.include_router(system_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)