from fastapi.testclient import TestClient

from app import main
from app.endpoints import feedback


client = TestClient(main.app)

ADMIN_USER_ID = "11111111-1111-1111-1111-111111111111"
EMPLOYEE_USER_ID = "22222222-2222-2222-2222-222222222222"


def test_submit_training_feedback_positive(monkeypatch):
    monkeypatch.setattr(feedback, "get_profile_role", lambda user_id: "admin")
    monkeypatch.setattr(
        feedback,
        "update_training_positive_score",
        lambda training_id, delta: {"id": training_id, "positive_score": 3 + delta},
    )

    response = client.post(
        "/api/feedback",
        json={
            "training_id": 42,
            "user_id": ADMIN_USER_ID,
            "positive_score": 1,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["training_id"] == 42
    assert body["positive_score"] == 4


def test_submit_training_feedback_requires_admin(monkeypatch):
    monkeypatch.setattr(feedback, "get_profile_role", lambda user_id: "employee")

    response = client.post(
        "/api/feedback",
        json={
            "training_id": 42,
            "user_id": EMPLOYEE_USER_ID,
            "positive_score": -1,
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"
