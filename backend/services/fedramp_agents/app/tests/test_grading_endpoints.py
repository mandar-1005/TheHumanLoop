from fastapi.testclient import TestClient

from app import main


client = TestClient(main.app)


def test_grade_multiple_choice_without_gemini():
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
    assert len(body["details"]) == 1
    assert body["details"][0]["is_correct"] is True
    assert body["details"][0]["answer_key"] == "AC"


def test_grade_short_response_with_mocked_grader(monkeypatch):
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

    monkeypatch.setattr(main, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.3,
        "questions": [
            {
                "question_id": "q2",
                "prompt": "How should privileged access be managed?",
                "question_type": "short_response",
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
    assert body["details"][0]["question_id"] == "q2"
    assert body["details"][0]["score"] == 84.0
    assert body["details"][0]["feedback"] == "Good response."
    assert body["details"][0]["answer_key"] == "Use least privilege and periodic access reviews."
    assert body["details"][0]["is_correct"] is True


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

    monkeypatch.setattr(main, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.9,
        "question": {
            "question_id": "q3",
            "prompt": "Describe case-study response process for incident handling.",
            "question_type": "case_study",
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


def test_role_template_rubric_is_applied_for_subjective(monkeypatch):
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
            # Include weighted criterion scoring to exercise consistency logic.
            return {
                "score": 10,
                "feedback": "Weighted by rubric criteria.",
                "strengths": ["Good control mapping."],
                "improvements": ["Add clearer implementation steps."],
                "criterion_scores": [
                    {"criterion": "Secure Coding Control Fit", "weight": 0.4, "score": 90, "rationale": "Strong"},
                    {"criterion": "Least-Privilege/Access Hygiene", "weight": 0.25, "score": 80, "rationale": "Good"},
                    {"criterion": "Implementation Specificity", "weight": 0.2, "score": 70, "rationale": "Average"},
                    {"criterion": "Clarity", "weight": 0.15, "score": 60, "rationale": "Needs detail"},
                ],
            }

    monkeypatch.setattr(main, "GradingAgent", FakeGradingAgent)

    payload = {
        "temperature": 0.3,
        "questions": [
            {
                "question_id": "q4",
                "prompt": "Describe how you implement AC-2 in your service.",
                "role": "Developer",
                "question_type": "short_response",
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
    # Weighted score should override raw score=10:
    # (0.4*90 + 0.25*80 + 0.2*70 + 0.15*60) = 79
    assert detail["score"] == 79.0
