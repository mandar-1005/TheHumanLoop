# FedRAMP Grading Logic

This document describes how employee assessment grading works in the FedRAMP agents service.

## Endpoints

- `POST /grading/grade`  
  Grades a full assessment (`questions` + `selected_answers`).
- `POST /grading/regrade`  
  Re-runs grading for one question with a modified `temperature`.
- `GET /health`  
  Basic health check.

## Question Types

| Type | Grading Method | AI Required |
|---|---|---|
| `multiple_choice` | Deterministic string match | No |
| `descriptive` | AI grading with role-based rubric | Yes |

## Core Flow

For each question:

1. **Resolve rubric** by role + question type:
   - Use explicit rubric text if provided in the request.
   - Else match a role-based rubric template (`developer`, `security_lead`, `team_lead`, `compliance_officer`, `other`).
   - Else fall back to a generic default rubric.
2. **Resolve passing threshold** from the rubric (varies by role — see below).
3. **Resolve employee answer** by `question_id`.
4. **Resolve answer key**:
   - Prefer `answer_key`, then `correct_answer` from the question payload.
   - If missing, generate an AI answer key from the prompt + rubric.
5. **Grade by question type**:
   - `multiple_choice`: deterministic normalized string match.
   - `descriptive`: AI grading against prompt + rubric + answer key.
6. **Compute weighted score** from `criterion_scores` returned by the AI (overrides raw score).
7. **Determine pass/fail** using the role-specific passing threshold.
8. **Aggregate**:
   - Per-question result includes score, correctness, feedback, strengths, improvements, criterion_scores, rubric.
   - Assessment result includes totals and percentage.

## Role Aliases

Multiple input strings map to a canonical role:

| Canonical Role | Accepted Inputs |
|---|---|
| `developer` | developer, software developer, dev, engineer |
| `security_lead` | security lead, security manager, security analyst |
| `team_lead` | development lead, developer team lead, team lead, tech lead, engineering manager |
| `compliance_officer` | compliance officer, auditor, compliance analyst |
| `other` | any unrecognized role string |

## Passing Thresholds by Role

| Role | Threshold |
|---|---|
| `developer` | 70% |
| `security_lead` | 75% |
| `team_lead` | 75% |
| `compliance_officer` | 80% |
| `other` | 70% |

Higher-responsibility roles require higher scores to pass.

## Role-Based Rubric Templates

Each role has a `descriptive` rubric template with weighted criteria tailored to their responsibilities:

- **Developer**: Secure coding & control fit, least-privilege / access hygiene, implementation specificity, clarity
- **Security Lead**: Policy / control accuracy, monitoring & detection strategy, risk prioritization, communication clarity
- **Team Lead**: Control-to-execution mapping, team process integration, priority / tradeoff judgement, clarity
- **Compliance Officer**: Control interpretation, evidence requirements, gap / risk identification, clarity
- **Other** (fallback): Accuracy, control alignment, practical applicability, clarity & completeness

Each criterion has a weight (summing to 1.0). The rubric text sent to the AI includes explicit scoring instructions.

## Weighted Criterion Scoring

For descriptive grading:

- Grading agent is prompted to score EACH criterion individually (0-100).
- Backend computes weighted score: `weighted_score = sum(weight * score) / sum(weight)`
- If valid criterion scores exist, weighted score **overrides** the raw AI score for consistency.
- This ensures the rubric weights are always respected regardless of model behavior.

## Deterministic Quiz Scoring

Multiple choice grading does not require AI:

- Normalize selected answer and answer key (trim, lowercase, collapse whitespace).
- Exact match = 100, else 0.
- This allows offline testing even without a Gemini API key.

## Regrading with Temperature

`/grading/regrade` re-calls grading logic with the provided `temperature` (0.0–2.0).

- Multiple choice remains deterministic (but requires `answer_key` or `correct_answer`).
- Descriptive questions use the new temperature for AI re-evaluation.
- Returns `is_correct` based on the role-specific passing threshold.

## JSON Parsing Robustness

The grading agent includes fallback JSON parsing:

1. Strip markdown code fences (` ```json ... ``` `) that Gemini sometimes wraps output in.
2. Attempt `json.loads` on cleaned text.
3. If that fails, extract the first `{...}` block via regex.
4. If all parsing fails, return a structured fallback with the raw text as feedback.

Additionally, `response_mime_type="application/json"` is set on all Gemini API calls to encourage well-formed JSON output.

## Files

- `app/main.py` — API routes and grading orchestration
- `app/pipeline/grading_agent.py` — AI answer key generation and descriptive grading
- `app/pipeline/rubric_engine.py` — role rubric templates, aliases, thresholds, and rubric resolution
- `app/pipeline/base_agent.py` — shared Gemini client with JSON response mode
- `app/schemas/training.py` — Pydantic request/response schemas with validation
- `app/models/training.py` — dataclass models for internal grading representation
- `app/tests/test_grading_endpoints.py` — offline endpoint tests (quiz, descriptive, role-based, threshold, mixed)
