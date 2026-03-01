# Set-Up

## Install Dependencies

pip install google-genai
pip install supabase
pip install python-dotenv

## Create a .env File

GOOGLE_GENAI_USE_VERTEXAI=FALSE
GOOGLE_API_KEY=your_gemini_api_key
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_secret_key_here

## Running the Orchestrator Test

python ./test_orchestrator.py outputs a sample JSON training in the terminal

## Running the Supabase Test

python ./test_supabase_pipeline.py takes in data from the most recent SSP added to the 'ssps' table in Supabase and adds a training for the developer role to the 'trainings' table in Supabase.
