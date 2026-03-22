from typing import Dict, List


ROLE_ALIASES = {
    "developer": "developer",
    "software developer": "developer",
    "dev": "developer",
    "engineer": "developer",
    "security lead": "security_lead",
    "security manager": "security_lead",
    "security analyst": "security_lead",
    "development lead": "team_lead",
    "developer team lead": "team_lead",
    "team lead": "team_lead",
    "tech lead": "team_lead",
    "engineering manager": "team_lead",
    "compliance officer": "compliance_officer",
    "auditor": "compliance_officer",
    "compliance analyst": "compliance_officer",
    "other": "other",
}

PASSING_THRESHOLDS: Dict[str, float] = {
    "developer": 70.0,
    "security_lead": 75.0,
    "team_lead": 75.0,
    "compliance_officer": 80.0,
    "other": 70.0,
}

DEFAULT_CRITERIA = {
    "descriptive": [
        {"name": "Accuracy", "weight": 0.30},
        {"name": "Control Alignment", "weight": 0.30},
        {"name": "Practical Applicability", "weight": 0.20},
        {"name": "Clarity & Completeness", "weight": 0.20},
    ],
}


ROLE_RUBRICS: Dict[str, Dict[str, Dict[str, object]]] = {
    "developer": {
        "descriptive": {
            "description": (
                "Evaluate whether the response demonstrates practical understanding "
                "of FedRAMP controls in day-to-day engineering work, including secure "
                "coding practices, access hygiene, and incident-level decision-making."
            ),
            "criteria": [
                {"name": "Secure Coding & Control Fit", "weight": 0.35},
                {"name": "Least-Privilege / Access Hygiene", "weight": 0.25},
                {"name": "Implementation Specificity", "weight": 0.25},
                {"name": "Clarity", "weight": 0.15},
            ],
        },
    },
    "security_lead": {
        "descriptive": {
            "description": (
                "Evaluate governance thinking, monitoring strategy, control enforcement, "
                "and risk-based decision-making appropriate for a security leader."
            ),
            "criteria": [
                {"name": "Policy / Control Accuracy", "weight": 0.30},
                {"name": "Monitoring & Detection Strategy", "weight": 0.25},
                {"name": "Risk Prioritization", "weight": 0.25},
                {"name": "Communication Clarity", "weight": 0.20},
            ],
        },
    },
    "team_lead": {
        "descriptive": {
            "description": (
                "Evaluate execution planning, team-level control adoption, and "
                "leadership decisions that balance velocity, risk, and compliance."
            ),
            "criteria": [
                {"name": "Control-to-Execution Mapping", "weight": 0.30},
                {"name": "Team Process Integration", "weight": 0.25},
                {"name": "Priority / Tradeoff Judgement", "weight": 0.25},
                {"name": "Clarity", "weight": 0.20},
            ],
        },
    },
    "compliance_officer": {
        "descriptive": {
            "description": (
                "Evaluate understanding of FedRAMP evidence quality, control intent, "
                "audit readiness, and POA&M decision-making."
            ),
            "criteria": [
                {"name": "Control Interpretation", "weight": 0.30},
                {"name": "Evidence Requirements", "weight": 0.25},
                {"name": "Gap / Risk Identification", "weight": 0.25},
                {"name": "Clarity", "weight": 0.20},
            ],
        },
    },
    "other": {
        "descriptive": {
            "description": "Evaluate general FedRAMP awareness and control understanding.",
            "criteria": [
                {"name": "Accuracy", "weight": 0.30},
                {"name": "Control Alignment", "weight": 0.30},
                {"name": "Practical Applicability", "weight": 0.20},
                {"name": "Clarity & Completeness", "weight": 0.20},
            ],
        },
    },
}


def canonical_role(role: str) -> str:
    return ROLE_ALIASES.get((role or "").strip().lower(), "other")


def passing_threshold(role: str) -> float:
    return PASSING_THRESHOLDS.get(canonical_role(role), 70.0)


def validate_criteria_weights(criteria: List[Dict[str, object]]) -> bool:
    if not criteria:
        return True
    total = sum(float(c.get("weight", 0)) for c in criteria)
    return abs(total - 1.0) < 0.01


def resolve_rubric(
    role: str,
    question_type: str,
    explicit_rubric: str = "",
) -> Dict[str, object]:
    if explicit_rubric:
        criteria = DEFAULT_CRITERIA.get(question_type, [])
        return {
            "role": canonical_role(role),
            "question_type": question_type,
            "description": explicit_rubric,
            "criteria": criteria,
            "passing_threshold": passing_threshold(role),
            "source": "explicit",
        }

    normalized_role = canonical_role(role)
    role_pack = ROLE_RUBRICS.get(normalized_role, {})
    template = role_pack.get(question_type)
    if template:
        return {
            "role": normalized_role,
            "question_type": question_type,
            "description": template["description"],
            "criteria": template["criteria"],
            "passing_threshold": PASSING_THRESHOLDS.get(normalized_role, 70.0),
            "source": "template",
        }

    return {
        "role": normalized_role,
        "question_type": question_type,
        "description": "Evaluate response quality, FedRAMP relevance, and practical applicability.",
        "criteria": DEFAULT_CRITERIA.get(question_type, []),
        "passing_threshold": PASSING_THRESHOLDS.get(normalized_role, 70.0),
        "source": "default",
    }


def rubric_to_text(rubric: Dict[str, object]) -> str:
    criteria: List[Dict[str, object]] = rubric.get("criteria", [])  # type: ignore[assignment]
    if not criteria:
        return str(rubric.get("description", ""))

    lines = [
        f"Role: {rubric.get('role')}",
        f"Type: {rubric.get('question_type')}",
        f"Passing threshold: {rubric.get('passing_threshold', 70)}%",
        str(rubric.get("description", "")),
        "",
        "Criteria (score each criterion 0-100, then the weighted total is computed):",
    ]
    for c in criteria:
        lines.append(f"- {c.get('name')}: weight {int(float(c.get('weight', 0)) * 100)}%")
    return "\n".join(lines)
