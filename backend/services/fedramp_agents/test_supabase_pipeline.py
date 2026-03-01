import json
from supabase_client import supabase
from orchestrator import generate_training

# Fetch latest SSP
ssp_response = supabase.table("ssps") \
    .select("*") \
    .order("created_at", desc=True) \
    .limit(1) \
    .execute()

if not ssp_response.data:
    raise Exception("No SSP found in database.")

ssp_text = ssp_response.data[0]["content"]

# Define roles (later this comes from DB)
roles = ["Software Developer", "Development Lead"]

# Run Agent Pipeline
training_output = generate_training(ssp_text, roles)

# Store training back in Supabase
supabase.table("trainings").insert({
    "company_id": ssp_response.data[0]["company_id"],
    "company_role": "Software Developer",
    "training_json": training_output
}).execute()

print("\nTraining generated and stored successfully.\n")