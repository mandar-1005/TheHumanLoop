from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional

from app.pipeline.base_agent import get_genai_client
from google.genai import types

router = APIRouter(prefix="/chat", tags=["chat"])

STUDY_CHAT_SYSTEM_PROMPT = """You are an AI study assistant for a FedRAMP compliance training module on the Secure Training platform.

Your job is to help the employee understand the training material below. You must ALWAYS answer questions that relate to this training content.

WHEN TO ANSWER (answer thoroughly and helpfully):
- Any question about topics, concepts, or controls mentioned in the study guide below
- Questions about FedRAMP, NIST 800-53, security compliance, or any security topic referenced in the training
- Requests to explain, summarize, or clarify parts of the study guide
- Questions like "what is...", "how does...", "why is... important" about training topics
- Asking for examples or real-world applications of concepts from the training
- Asking for hints or guidance on assessment questions (give conceptual help, not direct answers)

WHEN TO DECLINE (politely refuse):
- Questions completely unrelated to the training (e.g. cooking recipes, sports scores, personal advice, coding help unrelated to security)
- For these, respond with: "That's outside the scope of this training module. I'm here to help you with your {role} FedRAMP training — feel free to ask me anything about the study material!"

RESPONSE STYLE:
- Be helpful, clear, and encouraging
- Reference specific sections or concepts from the study guide when possible
- Keep answers focused but thorough — don't be too brief
- Use bullet points or numbered lists for complex explanations
- If the employee seems confused, break things down step by step

STUDY GUIDE CONTENT:
{study_guide}

EMPLOYEE ROLE: {role}
"""


class ChatMessage(BaseModel):
    role: str = Field(description="Either 'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str
    study_guide: str
    role: str = "developer"
    conversation_history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    error: Optional[str] = None


@router.post("/ask", response_model=ChatResponse)
def ask_study_chat(payload: ChatRequest):
    system_prompt = STUDY_CHAT_SYSTEM_PROMPT.format(
        study_guide=payload.study_guide[:8000],
        role=payload.role,
    )

    contents = []
    for msg in payload.conversation_history[-10:]:
        contents.append(
            types.Content(
                role="user" if msg.role == "user" else "model",
                parts=[types.Part.from_text(text=msg.content)],
            )
        )
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=payload.message)],
        )
    )

    try:
        client = get_genai_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.4,
            ),
        )
        return ChatResponse(reply=response.text or "I couldn't generate a response. Please try again.")
    except Exception as e:
        return ChatResponse(
            reply="Sorry, I'm having trouble connecting right now. Please try again in a moment.",
            error=str(e),
        )
