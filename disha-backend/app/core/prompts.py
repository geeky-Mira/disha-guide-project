# app/core/prompts.py
import json
from typing import List, Dict, Any
import re

# -----------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------

def _sanitize_input(text: str) -> str:
    """
    A simple sanitizer to remove potentially harmful characters from user input
    before including it in an AI prompt.
    """
    if not isinstance(text, str):
        return ""
    # Allow only alphanumeric characters, spaces, and basic punctuation.
    return re.sub(r'[^a-zA-Z0-9\s.,!?-]', '', text).strip()[:200]

# -----------------------------------------------------
# SYSTEM INSTRUCTIONS FOR MODELS
# -----------------------------------------------------

CHAT_MODEL_INSTRUCTION = """
You are 'Disha Guide', a personalized AI career mentor for Indian students.
Your role: Act like a thoughtful human mentor who helps students explore their education, interests, and goals to discover ideal career paths.
Conversation Rules:
1. Start warmly (ask name and wellbeing).
2. Progress step-by-step through education 
interests 
skills 
goals.
3. Give relevant, inspiring guidance
not robotic answers.
4. If the user expresses interest or agreement about a career, confirm it clearly.
5. Encourage reflection before recommending final career paths.
6. Output only short conversational text (no JSON, no code).
"""

PROFILE_EXTRACTION_INSTRUCTION = """
You are a data extractor. From the given conversation between an AI career guide and a student, extract a structured JSON object ONLY with the keys:
{
  "name": "string or null",
  "education": "string or null",
  "interests": ["list of strings"],
  "skills": ["list of strings"],
  "career_goals": "string or null"
}
Respond with **valid JSON only**, no explanations.
"""

CAREER_RECOMMENDATION_INSTRUCTION = """
You are a structured career recommender for the Indian job market. Given a student's profile, including their current education, return a JSON array of career options.
Each object must include:
{
  "career_name": "string",
  "description": "string (2-3 sentences)",
  "pathway": ["list of 5-7 key skills or steps"],
  "education_pathway": ["list of next educational steps, e.g., 'Master's in AI', 'Certification in Cloud Computing'. If current education is sufficient, return an empty array or a confirmation message."]
}
Respond with **valid JSON array only** 
no text before or after.
"""

# -----------------------------------------------------
# DYNAMIC PROMPT GENERATOR FUNCTIONS
# -----------------------------------------------------

# --- Prompts for Chat Router ---

def get_profile_extraction_prompt(transcript: str) -> str:
    """Generates the prompt for extracting a user's profile from a conversation."""
    return f"Extract a structured JSON profile from the user's statements (no explanations):\n\n{transcript}\n\nJSON:"

def get_career_recommendation_prompt(profile_data: Dict[str, Any]) -> str:
    """Generates the prompt for recommending careers based on a user profile."""
    profile_json = json.dumps(profile_data, indent=2)
    return (
        "Based on the following student profile for the Indian job market, recommend 5-7 career options.\n"
        "Each must include `career_name`, `description`, `pathway`, and `education_pathway` fields.\n"
        "Return ONLY a JSON array.\n\n"
        f"Profile:\n{profile_json}"
    )

def get_chat_prompt(conversation_text: str) -> str:
    """Generates the main prompt for the conversational AI mentor."""
    return (
        "You are Disha Guide, a friendly AI career mentor helping Indian students.\n"
        "Guide step-by-step through name, education, interests, skills, and career goals.\n\n"
        f"Here’s the conversation so far:\n\n{conversation_text}\n\nAI:"
    )

# --- Prompts for Forge Router ---

def generate_assessment_prompt(skill: str, career: str) -> str:
    """Generates the prompt for creating a skill assessment quiz."""
    sanitized_skill = _sanitize_input(skill)
    sanitized_career = _sanitize_input(career)
    
    return f'''
        Create a 5-question multiple-choice quiz to assess a user's skill in '{sanitized_skill}' for a '{sanitized_career}' career.

        Your response MUST be a single, valid JSON object. Do not include any other text, explanations, or markdown formatting.
        The JSON object must follow this exact structure:
        {{
          "quiz_title": "Quiz Title About The Skill",
          "questions": [
            {{
              "question_text": "What is the question?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "The correct option text",
              "explanation": "A brief, clear explanation of why the correct answer is right."
            }}
          ]
        }}
    '''

def find_resources_prompt(skill: str, career: str) -> str:
    """Generates the prompt for finding learning resources."""
    sanitized_skill = _sanitize_input(skill)
    sanitized_career = _sanitize_input(career)

    return (
        f"You have access to a web search tool. Use it to find the top 6 free, high-quality, relevant, trustworthy, world-class, popular, and free online learning resources/guides "
        f"for the skill '{sanitized_skill}' in the context of a '{sanitized_career}' career. "
        "Prioritize official documentation, highly-rated tutorials, and comprehensive articles. "
        f"The resources must be highly relevant for 2025 and focus on upcoming industry trends. " 
        "Prioritize resources from globally recognized platforms (like Coursera, edX, free university courses), official documentation, " 
        "and highly-rated, in-depth tutorials or articles from reputable sources. Avoid outdated materials. " 
        "After finding them, you MUST format the output as a single, valid JSON object. "
        "Do not include any other text or explanations outside of the JSON. "
        'The JSON object must follow this exact structure: {{"resources": [{{"title": "...", "url": "...", "type": "Official Docs/In-depth Tutorial/University Course/Video"}}]}}' 
    )

def generate_feedback_prompt(incorrect_questions: List[dict]) -> str:
    """Generates the prompt for providing feedback on incorrect quiz answers."""
    questions_summary = "\n".join(
        [
            f"Question: {_sanitize_input(q.get('question_text', ''))}\n"
            f"Correct Answer: {_sanitize_input(q.get('correct_answer', ''))}\n"
            f"Explanation: {_sanitize_input(q.get('explanation', ''))}\n---"
            for q in incorrect_questions
        ]
    )

    return f'''
        As an expert tutor, analyze the following questions that a student answered incorrectly.
        Based on these questions, identify the 2-4 most important underlying topics or concepts the student should focus on to improve.
        Do not just repeat the questions. Synthesize the information and provide a high-level list of study points.
        Incorrect Questions:
        {questions_summary}
        Your response MUST be a single, valid JSON object, structured exactly like this:
        {{
          "topics": [
            "Topic 1: A brief description...",
            "Topic 2: A brief description...",
            "Topic 3: A brief description..."
          ]
        }}
    '''