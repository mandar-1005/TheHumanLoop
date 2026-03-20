# FedRAMP Grading Logic

This document describes how employee assessment grading works in the FedRAMP agents service.

## Endpoints

- `POST /grading/grade`  
  Grades a full assessment (`questions` + `selected_answers`).
- `POST /grading/regrade`  
  Re-runs grading for one question with a modified `temperature`.
- `GET /health`  
  Basic health check.

## Core Flow

For each question:

1. Resolve employee answer by `question_id`.
2. Resolve rubric:
   - Use explicit rubric if provided.
   - Else use role-based rubric template (`developer`, `security_lead`, `team_lead`, `compliance_officer`).
   - Else use a default fallback rubric.
3. Resolve answer key:
   - Prefer `answer_key`, then `correct_answer`.
   - If missing, generate an AI answer key from prompt + rubric.
4. Grade by question type:
   - `multiple_choice`: deterministic normalized string match.
   - Subjective (`short_response`, `case_study`, etc.): AI grading against prompt + rubric + answer key.
5. Aggregate:
   - Per-question result includes score, correctness, feedback, strengths, improvements.
   - Assessment result includes totals and percentage.

## Role-Based Rubric Templates

Rubrics are selected by:

- `role` (normalized with aliases)
- `question_type`

Each rubric template includes:

- `description`
- `criteria[]` with weighted dimensions (e.g. control alignment, risk identification, evidence quality)

This enforces consistent grading expectations by employee role.

## Weighted Criterion Scoring

For subjective grading:

- Grading agent is prompted to return:
  - `score` (0-100)
  - `criterion_scores[]` with `{criterion, weight, score, rationale}`
- Backend computes weighted score:
  - `weighted_score = sum(weight * score) / sum(weight)`
- If valid criterion scores exist, weighted score overrides raw score for consistency.

## Deterministic Objective Scoring

Multiple choice grading does not require AI:

- Normalize selected answer and answer key (trim/lower/collapse whitespace).
- Exact match = 100, else 0.

This allows offline testing even without a Gemini API key.

## Regrading with Temperature

`/grading/regrade` re-calls grading logic with the provided `temperature`.

- Multiple choice remains deterministic.
- Subjective questions use the new temperature for AI re-evaluation.

## Files

- `app/main.py` - API routes and grading orchestration
- `app/pipeline/grading_agent.py` - AI answer key generation and subjective grading
- `app/pipeline/rubric_engine.py` - role rubric templates and rubric resolution
- `app/schemas/training.py` - grading request schemas
- `app/tests/test_grading_endpoints.py` - offline endpoint tests
