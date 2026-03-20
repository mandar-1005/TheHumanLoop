from typing import Dict, List


ROLE_ALIASES = {
    "developer": "developer",
    "software developer": "developer",
    "security lead": "security_lead",
    "security manager": "security_lead",
    "development lead": "team_lead",
    "developer team lead": "team_lead",
    "team lead": "team_lead",
    "compliance officer": "compliance_officer",
    "other": "other",
}


DEFAULT_CRITERIA = {
    "short_response": [
        {"name": "Accuracy", "weight": 0.35},
        {"name": "Control Alignment", "weight": 0.35},
        {"name": "Clarity", "weight": 0.20},
        {"name": "Completeness", "weight": 0.10},
    ],
    "case_study": [
        {"name": "Risk Identification", "weight": 0.25},
        {"name": "Control Application", "weight": 0.35},
        {"name": "Decision Quality", "weight": 0.25},
        {"name": "Evidence & Documentation", "weight": 0.15},
    ],
}


ROLE_RUBRICS: Dict[str, Dict[str, Dict[str, object]]] = {
    "developer": {
        "short_response": {
            "description": "Evaluate whether the response applies FedRAMP controls in day-to-day engineering work.",
            "criteria": [
                {"name": "Secure Coding Control Fit", "weight": 0.40},
                {"name": "Least-Privilege/Access Hygiene", "weight": 0.25},
                {"name": "Implementation Specificity", "weight": 0.20},
                {"name": "Clarity", "weight": 0.15},
            ],
        },
        "case_study": {
            "description": "Evaluate practical incident and remediation decisions at engineer level.",
            "criteria": [
                {"name": "Threat/Risk Recognition", "weight": 0.30},
                {"name": "Control-Driven Remediation", "weight": 0.35},
                {"name": "Operational Feasibility", "weight": 0.20},
                {"name": "Evidence Quality", "weight": 0.15},
            ],
        },
    },
    "security_lead": {
        "short_response": {
            "description": "Evaluate governance, monitoring, and control enforcement thinking.",
            "criteria": [
                {"name": "Policy/Control Accuracy", "weight": 0.30},
                {"name": "Monitoring & Detection Strategy", "weight": 0.30},
                {"name": "Risk Prioritization", "weight": 0.25},
                {"name": "Communication Clarity", "weight": 0.15},
            ],
        },
        "case_study": {
            "description": "Evaluate security leadership decisions for high-impact scenarios.",
            "criteria": [
                {"name": "Risk Triage", "weight": 0.25},
                {"name": "Control Selection & Justification", "weight": 0.30},
                {"name": "Cross-Team Coordination", "weight": 0.25},
                {"name": "Audit Readiness", "weight": 0.20},
            ],
        },
    },
    "team_lead": {
        "short_response": {
            "description": "Evaluate execution planning and control adoption by engineering teams.",
            "criteria": [
                {"name": "Control-to-Execution Mapping", "weight": 0.35},
                {"name": "Team Process Integration", "weight": 0.30},
                {"name": "Priority/Tradeoff Judgement", "weight": 0.20},
                {"name": "Clarity", "weight": 0.15},
            ],
        },
        "case_study": {
            "description": "Evaluate leadership decisions balancing velocity, risk, and compliance evidence.",
            "criteria": [
                {"name": "Scenario Diagnosis", "weight": 0.25},
                {"name": "Decision Rationale", "weight": 0.30},
                {"name": "Implementation Plan", "weight": 0.25},
                {"name": "Evidence & Follow-up", "weight": 0.20},
            ],
        },
    },
    "compliance_officer": {
        "short_response": {
            "description": "Evaluate understanding of FedRAMP evidence quality and control intent.",
            "criteria": [
                {"name": "Control Interpretation", "weight": 0.35},
                {"name": "Evidence Requirements", "weight": 0.30},
                {"name": "Gap Identification", "weight": 0.20},
                {"name": "Clarity", "weight": 0.15},
            ],
        },
        "case_study": {
            "description": "Evaluate compliance decision-making for audits and POA&M actions.",
            "criteria": [
                {"name": "Audit Impact Assessment", "weight": 0.25},
                {"name": "Remediation Prioritization", "weight": 0.30},
                {"name": "Evidence Plan", "weight": 0.25},
                {"name": "Stakeholder Communication", "weight": 0.20},
            ],
        },
    },
}


def canonical_role(role: str) -> str:
    return ROLE_ALIASES.get((role or "").strip().lower(), "other")


def resolve_rubric(role: str, question_type: str, explicit_rubric: str = "") -> Dict[str, object]:
    if explicit_rubric:
        return {
            "role": canonical_role(role),
            "question_type": question_type,
            "description": explicit_rubric,
            "criteria": DEFAULT_CRITERIA.get(question_type, []),
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
            "source": "template",
        }

    return {
        "role": normalized_role,
        "question_type": question_type,
        "description": "Evaluate response quality, FedRAMP relevance, and practical applicability.",
        "criteria": DEFAULT_CRITERIA.get(question_type, []),
        "source": "default",
    }


def rubric_to_text(rubric: Dict[str, object]) -> str:
    criteria: List[Dict[str, object]] = rubric.get("criteria", [])  # type: ignore[assignment]
    if not criteria:
        return str(rubric.get("description", ""))
    lines = [f"Role: {rubric.get('role')}", f"Type: {rubric.get('question_type')}", str(rubric.get("description", "")), "Criteria:"]
    for c in criteria:
        lines.append(f"- {c.get('name')}: weight {int(float(c.get('weight', 0)) * 100)}%")
    return "\n".join(lines)

