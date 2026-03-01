from orchestrator import generate_training

# Fake SSP (short + simple for testing)
fake_ssp = """
AC-2 Account Management:
The system enforces role-based access control.
Developers must follow secure coding practices.
Development leads must review security logs and approve access requests.
"""

# Roles list
roles = [
    "Software Developer",
    "Development Lead"
]

result = generate_training(fake_ssp, roles)

print("\n===== TRAINING OUTPUT =====\n")
print(result)