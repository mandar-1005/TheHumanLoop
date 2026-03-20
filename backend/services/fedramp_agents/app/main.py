from fastapi import FastAPI, HTTPException

from app.pipeline.grading_agent import GradingAgent
from app.pipeline.rubric_engine import resolve_rubric, rubric_to_text
from app.schemas.training import (
    GradeAssessmentRequest,
    RegradeRequest,
)

app = FastAPI(title="FedRAMP Agents Service")


def _normalize(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def _find_selected_answer(selected_answers, question_id: str) -> str:
    for item in selected_answers:
        if item.question_id == question_id:
            return item.answer
    return ""


def _grade_objective(selected_answer: str, answer_key: str) -> tuple[float, bool]:
    is_correct = _normalize(selected_answer) == _normalize(answer_key)
    return (1.0 if is_correct else 0.0, is_correct)


def _weighted_score_from_criteria(criterion_scores) -> float:
    if not criterion_scores:
        return -1.0
    weighted = 0.0
    total_weight = 0.0
    for item in criterion_scores:
        try:
            w = float(item.get("weight", 0))
            s = float(item.get("score", 0))
        except Exception:
            continue
        weighted += w * s
        total_weight += w
    if total_weight <= 0:
        return -1.0
    return max(0.0, min(100.0, weighted / total_weight))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/grading/grade")
def grade_assessment(payload: GradeAssessmentRequest):
    if not payload.questions:
        raise HTTPException(status_code=400, detail="questions cannot be empty")

    grader = None
    graded_questions = []
    score_total = 0.0

    for question in payload.questions:
        selected_answer = _find_selected_answer(payload.selected_answers, question.question_id)
        if not selected_answer:
            graded_questions.append(
                {
                    "question_id": question.question_id,
                    "score": 0,
                    "selected_answer": "",
                    "answer_key": question.answer_key or question.correct_answer or "",
                    "is_correct": False,
                    "feedback": "No answer submitted.",
                    "strengths": [],
                    "improvements": ["Submit an answer for this question."],
                }
            )
            continue

        rubric_bundle = resolve_rubric(question.role, question.question_type, question.rubric or "")
        rubric_text = rubric_to_text(rubric_bundle)

        answer_key = question.answer_key or question.correct_answer
        if not answer_key:
            if grader is None:
                grader = GradingAgent()
            key_result = grader.generate_answer_key(
                prompt=question.prompt,
                rubric=rubric_text,
                temperature=0.2,
            )
            answer_key = key_result.get("answer_key", "")

        if question.question_type == "multiple_choice":
            score, is_correct = _grade_objective(selected_answer, answer_key)
            feedback = "Correct answer." if is_correct else "Selected answer does not match answer key."
            strengths = ["Matched expected answer."] if is_correct else []
            improvements = [] if is_correct else ["Review the study guide and rationale for this control."]
            criterion_scores = []
        else:
            if grader is None:
                grader = GradingAgent()
            llm_grade = grader.grade_response(
                assessment_prompt=question.prompt,
                employee_response=selected_answer,
                rubric=rubric_text,
                answer_key=answer_key or "",
                temperature=payload.temperature,
            )
            raw_score = llm_grade.get("score", 0)
            criterion_scores = llm_grade.get("criterion_scores", []) or []
            weighted_score = _weighted_score_from_criteria(criterion_scores)
            if weighted_score >= 0:
                raw_score = weighted_score
            try:
                score = max(0.0, min(1.0, float(raw_score) / 100.0))
            except Exception:
                score = 0.0
            is_correct = score >= 0.7
            feedback = llm_grade.get("feedback", "")
            strengths = llm_grade.get("strengths", []) or []
            improvements = llm_grade.get("improvements", []) or []

        score_total += score
        graded_questions.append(
            {
                "question_id": question.question_id,
                "score": round(score * 100, 2),
                "selected_answer": selected_answer,
                "answer_key": answer_key or "",
                "is_correct": is_correct,
                "feedback": feedback,
                "strengths": strengths,
                "improvements": improvements,
                "criterion_scores": criterion_scores,
                "rubric": rubric_bundle,
            }
        )

    total_questions = len(payload.questions)
    percentage = (score_total / total_questions) * 100 if total_questions else 0

    return {
        "total_questions": total_questions,
        "total_score": round(score_total * 100, 2),
        "max_score": total_questions * 100,
        "percentage": round(percentage, 2),
        "details": graded_questions,
    }


@app.post("/grading/regrade")
def regrade_with_temperature(payload: RegradeRequest):
    grader = GradingAgent()
    question = payload.question
    rubric_bundle = resolve_rubric(question.role, question.question_type, question.rubric or "")
    rubric_text = rubric_to_text(rubric_bundle)

    answer_key = question.answer_key or question.correct_answer
    if not answer_key:
        key_result = grader.generate_answer_key(
            prompt=question.prompt,
            rubric=rubric_text,
            temperature=0.2,
        )
        answer_key = key_result.get("answer_key", "")

    if question.question_type == "multiple_choice":
        score, is_correct = _grade_objective(payload.selected_answer, answer_key)
        feedback = "Correct answer." if is_correct else "Selected answer does not match answer key."
        return {
            "question_id": question.question_id,
            "temperature": payload.temperature,
            "score": round(score * 100, 2),
            "is_correct": is_correct,
            "answer_key": answer_key,
            "feedback": feedback,
        }

    llm_grade = grader.grade_response(
        assessment_prompt=question.prompt,
        employee_response=payload.selected_answer,
        rubric=rubric_text,
        answer_key=answer_key or "",
        temperature=payload.temperature,
    )
    criterion_scores = llm_grade.get("criterion_scores", []) or []
    weighted_score = _weighted_score_from_criteria(criterion_scores)
    if weighted_score >= 0:
        llm_grade["score"] = round(weighted_score, 2)

    return {
        "question_id": question.question_id,
        "temperature": payload.temperature,
        "answer_key": answer_key,
        "rubric": rubric_bundle,
        "grading_result": llm_grade,
    }
