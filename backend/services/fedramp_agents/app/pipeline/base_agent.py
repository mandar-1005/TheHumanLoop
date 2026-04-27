import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()


def get_genai_client() -> genai.Client:
    """Create a genai client with Vertex AI fallback.

    Priority: GOOGLE_CLOUD_PROJECT (Vertex AI) > GOOGLE_API_KEY (Gemini API).
    """
    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    if project:
        location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        return genai.Client(vertexai=True, project=project, location=location)
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        return genai.Client(api_key=api_key)
    return genai.Client()


class BaseAgent:
    def __init__(self, system_instruction, model="gemini-2.5-flash"):
        self.system_instruction = system_instruction
        self.model_name = model
        self.client = get_genai_client()

    def run(self, prompt, temperature=0.2):
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=self.system_instruction,
                temperature=temperature,
                response_mime_type="application/json",
            ),
        )
        return response.text
