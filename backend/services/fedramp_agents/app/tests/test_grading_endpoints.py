import pytest
from fastapi.testclient import TestClient

from app import main
from app.services import grading_service


client = TestClient(main.app)


# ---------------------------------------------------------------------------
# Multiple-choice (quiz) tests — deterministic, no Gemini needed
# ---------------------------------------------------------------------------

def test_grade_multiple_choice_correct():
    payload = {
        "temperature": 0.2,
        "questions": [
            {
                "question_id": "q1",
                "prompt": "Which control family is account management?",
                "question_type": "multiple_choice",
                "options": ["AC", "IR", "RA", "SI"],
                "correct_answer": "AC",
            }
        ],
        "selected_answers": [{"question_id": "q1", "answer": "AC"}],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["total_questions"] == 1
    assert body["percentage"] == 100.0
    detail = body["details"][0]
    assert detail["is_correct"] is True
    assert detail["score"] == 100.0
    assert detail["answer_key"] == "AC"
    assert detail["criterion_scores"] == []
    assert detail["rubric"] is not None


def test_grade_multiple_choice_wrong():
    payload = {
        "temperature": 0.2,
        "questions": [
            {
                "question_id": "q1",
                "prompt": "Which control family is account management?",
                "question_type": "multiple_choice",
                "options": ["AC", "IR", "RA", "SI"],
                "correct_answer": "AC",
            }
        ],
        "selected_answers": [{"question_id": "q1", "answer": "IR"}],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["percentage"] == 0.0
    detail = body["details"][0]
    assert detail["is_correct"] is False
    assert detail["score"] == 0.0
    assert len(detail["improvements"]) > 0


def test_grade_multiple_choice_case_insensitive():
    payload = {
        "temperature": 0.2,
        "questions": [
            {
                "question_id": "q1",
                "prompt": "Which control family is account management?",
                "question_type": "multiple_choice",
                "correct_answer": "AC",
            }
        ],
        "selected_answers": [{"question_id": "q1", "answer": "  ac  "}],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200
    assert response.json()["details"][0]["is_correct"] is True


# ---------------------------------------------------------------------------
# Unanswered question
# ---------------------------------------------------------------------------

def test_unanswered_question_returns_zero():
    payload = {
        "temperature": 0.2,
        "questions": [
            {
                "question_id": "q1",
                "prompt": "Some question",
                "question_type": "multiple_choice",
                "correct_answer": "AC",
            }
        ],
        "selected_answers": [],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200

    detail = response.json()["details"][0]
    assert detail["score"] == 0
    assert detail["is_correct"] is False
    assert detail["feedback"] == "No answer submitted."
    assert "criterion_scores" in detail
    assert "rubric" in detail


# ---------------------------------------------------------------------------
# Empty questions validation
# ---------------------------------------------------------------------------

def test_empty_questions_returns_400():
    payload = {"temperature": 0.2, "questions": [], "selected_answers": []}
    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Descriptive answer grading with mocked agent
# ---------------------------------------------------------------------------

def test_grade_descriptive_with_mocked_grader(monkeypatch):
    class FakeGradingAgent:
        def generate_answer_key(self, prompt, rubric="", temperature=0.2):
            return {
                "answer_key": "Use least privilege and periodic access reviews.",
                "key_points": ["least privilege", "periodic review"],
            }

        def grade_response(
            self,
            assessment_prompt,
            employee_response,
            rubric="",
            answer_key="",
            temperature=0.2,
        ):
            return {
                "score": 84,
                "feedback": "Good response.",
                "strengths": ["Mentions least privilege."],
                "improvements": ["Add stronger audit evidence examples."],
            }

    monkeypatch.setattr(grading_service, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.3,
        "questions": [
            {
                "question_id": "q2",
                "prompt": "How should privileged access be managed?",
                "question_type": "descriptive",
                "rubric": "Must include least privilege and periodic review.",
            }
        ],
        "selected_answers": [
            {"question_id": "q2", "answer": "Use least privilege and review quarterly."}
        ],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["total_questions"] == 1
    detail = body["details"][0]
    assert detail["question_id"] == "q2"
    assert detail["score"] == 84.0
    assert detail["feedback"] == "Good response."
    assert detail["answer_key"] == "Use least privilege and periodic access reviews."
    assert detail["is_correct"] is True


# ---------------------------------------------------------------------------
# Regrade with temperature
# ---------------------------------------------------------------------------

def test_regrade_uses_modified_temperature(monkeypatch):
    observed = {"temperature": None}

    class FakeGradingAgent:
        def generate_answer_key(self, prompt, rubric="", temperature=0.2):
            return {"answer_key": "Reference NIST controls and evidence artifacts."}

        def grade_response(
            self,
            assessment_prompt,
            employee_response,
            rubric="",
            answer_key="",
            temperature=0.2,
        ):
            observed["temperature"] = temperature
            return {
                "score": 71,
                "feedback": "Reasonable but could be more specific.",
                "strengths": ["Understands review cadence."],
                "improvements": ["Add artifact examples."],
            }

    monkeypatch.setattr(grading_service, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.9,
        "question": {
            "question_id": "q3",
            "prompt": "Describe your incident handling process.",
            "question_type": "descriptive",
            "rubric": "Must include triage, containment, and post-incident review.",
        },
        "selected_answer": "We should triage quickly, contain impact, and run a postmortem.",
    }

    response = client.post("/grading/regrade", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["question_id"] == "q3"
    assert body["temperature"] == 0.9
    assert observed["temperature"] == 0.9
    assert body["grading_result"]["score"] == 71


def test_regrade_mcq_without_answer_key_returns_400():
    payload = {
        "temperature": 0.5,
        "question": {
            "question_id": "q1",
            "prompt": "Which family?",
            "question_type": "multiple_choice",
        },
        "selected_answer": "AC",
    }
    response = client.post("/grading/regrade", json=payload)
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Role-based rubric template + weighted scoring
# ---------------------------------------------------------------------------

def test_role_template_rubric_is_applied_for_descriptive(monkeypatch):
    class FakeGradingAgent:
        def generate_answer_key(self, prompt, rubric="", temperature=0.2):
            return {"answer_key": "Use secure coding and least privilege."}

        def grade_response(
            self,
            assessment_prompt,
            employee_response,
            rubric="",
            answer_key="",
            temperature=0.2,
        ):
            return {
                "score": 10,
                "feedback": "Weighted by rubric criteria.",
                "strengths": ["Good control mapping."],
                "improvements": ["Add clearer implementation steps."],
                "criterion_scores": [
                    {"criterion": "Secure Coding & Control Fit", "weight": 0.35, "score": 90, "rationale": "Strong"},
                    {"criterion": "Least-Privilege / Access Hygiene", "weight": 0.25, "score": 80, "rationale": "Good"},
                    {"criterion": "Implementation Specificity", "weight": 0.25, "score": 70, "rationale": "Average"},
                    {"criterion": "Clarity", "weight": 0.15, "score": 60, "rationale": "Needs detail"},
                ],
            }

    monkeypatch.setattr(grading_service, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.3,
        "questions": [
            {
                "question_id": "q4",
                "prompt": "Describe how you implement AC-2 in your service.",
                "role": "Developer",
                "question_type": "descriptive",
            }
        ],
        "selected_answers": [{"question_id": "q4", "answer": "I enforce RBAC and periodic access checks."}],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200
    body = response.json()

    detail = body["details"][0]
    assert detail["rubric"]["source"] == "template"
    assert detail["rubric"]["role"] == "developer"
    assert detail["rubric"]["passing_threshold"] == 70.0
    # Weighted score overrides raw score=10:
    # (0.35*90 + 0.25*80 + 0.25*70 + 0.15*60) = 78
    assert detail["score"] == 78.0
    assert detail["is_correct"] is True


# ---------------------------------------------------------------------------
# Unknown role falls back to "other"
# ---------------------------------------------------------------------------

def test_unknown_role_uses_other_rubric(monkeypatch):
    class FakeGradingAgent:
        def generate_answer_key(self, prompt, rubric="", temperature=0.2):
            return {"answer_key": "General answer."}

        def grade_response(
            self,
            assessment_prompt,
            employee_response,
            rubric="",
            answer_key="",
            temperature=0.2,
        ):
            return {
                "score": 65,
                "feedback": "Average.",
                "strengths": [],
                "improvements": ["Be more specific."],
                "criterion_scores": [],
            }

    monkeypatch.setattr(grading_service, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.2,
        "questions": [
            {
                "question_id": "q5",
                "prompt": "What is AC-2?",
                "role": "Janitor",
                "question_type": "descriptive",
            }
        ],
        "selected_answers": [{"question_id": "q5", "answer": "Account management control."}],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200

    detail = response.json()["details"][0]
    assert detail["rubric"]["role"] == "other"
    assert detail["rubric"]["source"] == "template"
    assert detail["rubric"]["passing_threshold"] == 70.0


# ---------------------------------------------------------------------------
# Passing threshold varies by role
# ---------------------------------------------------------------------------

def test_compliance_officer_higher_threshold(monkeypatch):
    class FakeGradingAgent:
        def generate_answer_key(self, prompt, rubric="", temperature=0.2):
            return {"answer_key": "Detailed compliance answer."}

        def grade_response(
            self,
            assessment_prompt,
            employee_response,
            rubric="",
            answer_key="",
            temperature=0.2,
        ):
            return {
                "score": 75,
                "feedback": "Decent.",
                "strengths": ["Some knowledge."],
                "improvements": ["More evidence detail."],
                "criterion_scores": [],
            }

    monkeypatch.setattr(grading_service, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.2,
        "questions": [
            {
                "question_id": "q6",
                "prompt": "Describe POA&M process.",
                "role": "compliance officer",
                "question_type": "descriptive",
            }
        ],
        "selected_answers": [{"question_id": "q6", "answer": "We track findings in a POA&M spreadsheet."}],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200

    detail = response.json()["details"][0]
    assert detail["rubric"]["passing_threshold"] == 80.0
    assert detail["is_correct"] is False


# ---------------------------------------------------------------------------
# Mixed assessment (quiz + descriptive in one payload)
# ---------------------------------------------------------------------------

def test_mixed_assessment(monkeypatch):
    class FakeGradingAgent:
        def generate_answer_key(self, prompt, rubric="", temperature=0.2):
            return {"answer_key": "Ideal answer for descriptive question."}

        def grade_response(
            self,
            assessment_prompt,
            employee_response,
            rubric="",
            answer_key="",
            temperature=0.2,
        ):
            return {
                "score": 80,
                "feedback": "Good.",
                "strengths": ["Solid."],
                "improvements": [],
                "criterion_scores": [],
            }

    monkeypatch.setattr(grading_service, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.2,
        "questions": [
            {
                "question_id": "mcq1",
                "prompt": "Which family?",
                "question_type": "multiple_choice",
                "correct_answer": "AC",
            },
            {
                "question_id": "desc1",
                "prompt": "Explain AC-2.",
                "question_type": "descriptive",
                "role": "developer",
            },
        ],
        "selected_answers": [
            {"question_id": "mcq1", "answer": "AC"},
            {"question_id": "desc1", "answer": "Account management control."},
        ],
    }

    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["total_questions"] == 2
    assert body["details"][0]["is_correct"] is True
    assert body["details"][0]["score"] == 100.0
    assert body["details"][1]["score"] == 80.0


# ---------------------------------------------------------------------------
# Temperature validation
# ---------------------------------------------------------------------------

def test_temperature_out_of_range_returns_422():
    payload = {
        "temperature": 5.0,
        "questions": [
            {
                "question_id": "q1",
                "prompt": "Test",
                "question_type": "multiple_choice",
                "correct_answer": "A",
            }
        ],
        "selected_answers": [{"question_id": "q1", "answer": "A"}],
    }
    response = client.post("/grading/grade", json=payload)
    assert response.status_code == 422
