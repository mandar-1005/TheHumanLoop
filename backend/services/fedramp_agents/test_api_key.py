import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure API key
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("API key not found. Check your .env file.")

genai.configure(api_key=api_key)

# Initialize model
model = genai.GenerativeModel("gemini-2.5-flash")

# Send a simple test prompt
response = model.generate_content("Explain what FedRAMP is in one sentence.")

print("\nModel response:\n")
print(response.text)