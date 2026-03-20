import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()


class BaseAgent:
    def __init__(self, system_instruction, model="gemini-2.5-flash"):
        self.system_instruction = system_instruction
        self.model_name = model

        api_key = os.getenv("GOOGLE_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else genai.Client()

    def run(self, prompt):
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=self.system_instruction
            ),
        )
        return response.text