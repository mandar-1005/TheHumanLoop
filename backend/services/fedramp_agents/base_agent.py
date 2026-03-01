import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class BaseAgent:
    def __init__(self, system_instruction, model="gemini-2.5-flash"):
        self.model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_instruction
        )

    def run(self, prompt):
        response = self.model.generate_content(prompt)
        return response.text