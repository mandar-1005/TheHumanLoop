import os
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure API key
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("API key not found. Check your .env file.")

client = genai.Client(api_key=api_key)

# Send a simple test prompt
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Explain what FedRAMP is in one sentence.",
)

print("\nModel response:\n")
print(response.text)