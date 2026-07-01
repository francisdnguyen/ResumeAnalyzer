"""
AI service — OpenAI integration for embeddings, job analysis, and match scoring.

All calls are async via AsyncOpenAI. generate_embedding never raises — returns None
on failure so callers can persist NULL and handle gracefully.
"""

import json
import logging
import math

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def generate_embedding(text: str) -> list[float] | None:
    """
    Generate a 1536-dim text-embedding-3-small vector.
    Returns None on any failure — never raises.
    """
    try:
        response = await _get_client().embeddings.create(
            model="text-embedding-3-small",
            input=text[:32_000],  # ~8k token safety cap
        )
        return response.data[0].embedding
    except Exception as exc:
        logger.error("generate_embedding failed: %s", exc)
        return None


async def analyze_job_description(description: str) -> dict:
    """
    Extract structured data from a job description with GPT-4.1-mini.

    Returns:
        {
          "title": str | None,
          "company": str | None,
          "required_skills": list[str],
          "preferred_skills": list[str],
          "experience_level": str | None,
          "education_requirement": str | None,
        }
    Raises on total failure so the calling route can return a 502.
    """
    system = (
        "You are a job description parser. Extract structured data and return ONLY valid JSON "
        "with these exact keys:\n"
        "- title: job title (string or null)\n"
        "- company: company name (string or null)\n"
        "- required_skills: required technical and soft skills (list of strings)\n"
        "- preferred_skills: nice-to-have or preferred skills (list of strings)\n"
        "- experience_level: e.g. '3-5 years', 'Senior', 'Entry-level', or null\n"
        "- education_requirement: e.g. \"Bachelor's in CS\", 'Any degree', or null\n"
        "Return only the JSON object — no markdown, no explanation."
    )

    response = await _get_client().chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": description[:8_000]},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("analyze_job_description: invalid JSON from GPT — %s", raw[:200])
        data = {}

    return {
        "title": data.get("title"),
        "company": data.get("company"),
        "required_skills": data.get("required_skills") or [],
        "preferred_skills": data.get("preferred_skills") or [],
        "experience_level": data.get("experience_level"),
        "education_requirement": data.get("education_requirement"),
    }


async def generate_match_analysis(
    resume_text: str,
    job_description: str,
    required_skills: list[str],
    preferred_skills: list[str],
) -> dict:
    """
    Produce a weighted match analysis using GPT-4.1-mini.

    Scoring weights: technical_skills 40%, experience_alignment 25%,
    keywords 15%, preferred_skills 10%, education 10%.

    Returns:
        {
          "overall_score": int (0-100),
          "breakdown": {technical_skills, experience_alignment, keywords,
                        preferred_skills, education},
          "strengths": list[str],
          "gaps": list[str],
          "missing_skills": list[str],
        }
    Raises on total failure so the calling route can return a 502.
    Semantic similarity (embedding cosine) is computed separately in the route and
    combined with this result there — it is not an LLM concern.
    """
    skills_ctx = ""
    if required_skills:
        skills_ctx += f"\nRequired skills: {', '.join(required_skills)}"
    if preferred_skills:
        skills_ctx += f"\nPreferred skills: {', '.join(preferred_skills)}"

    system = (
        "You are a resume-job match analyst. Evaluate the match and return ONLY valid JSON "
        "with these exact keys:\n"
        "- overall_score: weighted match score 0-100 (integer). "
        "Weights: technical_skills 40%, experience_alignment 25%, "
        "keywords 15%, preferred_skills 10%, education 10%.\n"
        "- breakdown: object with keys technical_skills, experience_alignment, "
        "keywords, preferred_skills, education — each an integer 0-100.\n"
        "- strengths: 2-4 specific candidate strengths relevant to this role (list of strings).\n"
        "- gaps: 2-4 specific gaps or areas to improve (list of strings).\n"
        "- missing_skills: skills explicitly required in the job but absent from the resume "
        "(list of strings, empty list if none).\n"
        f"Extracted job skills:{skills_ctx}\n"
        "Return only the JSON object — no markdown, no explanation."
    )

    response = await _get_client().chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"RESUME:\n{resume_text[:4_000]}\n\n"
                    f"JOB DESCRIPTION:\n{job_description[:3_000]}"
                ),
            },
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("generate_match_analysis: invalid JSON from GPT — %s", raw[:200])
        data = {}

    breakdown = data.get("breakdown") or {}

    return {
        "overall_score": int(data.get("overall_score") or 0),
        "breakdown": {
            "technical_skills": int(breakdown.get("technical_skills") or 0),
            "experience_alignment": int(breakdown.get("experience_alignment") or 0),
            "keywords": int(breakdown.get("keywords") or 0),
            "preferred_skills": int(breakdown.get("preferred_skills") or 0),
            "education": int(breakdown.get("education") or 0),
        },
        "strengths": data.get("strengths") or [],
        "gaps": data.get("gaps") or [],
        "missing_skills": data.get("missing_skills") or [],
    }


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two equal-length vectors. Returns 0.0 for zero-magnitude inputs."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0
    return dot / (mag_a * mag_b)


async def rewrite_bullet(bullet: str, job_description: str) -> list[str]:
    """
    Generate 3 improved resume bullet points targeting the given job description.
    Uses GPT-4.1 for higher output quality.

    Returns a list of up to 3 rewritten bullets; may be shorter if GPT returns fewer.
    Raises on total failure so the calling route can return 502.
    """
    system = (
        "You are a professional resume writer. Rewrite the given resume bullet point "
        "to better match the job description. Return ONLY valid JSON with this exact key:\n"
        "- rewrites: list of exactly 3 improved bullet points (list of strings)\n"
        "Each rewrite must:\n"
        "- Start with a strong action verb\n"
        "- Include quantifiable impact where naturally possible (don't invent numbers)\n"
        "- Use keywords from the job description where they fit organically\n"
        "- Stay concise — one sentence max\n"
        "Return only the JSON object — no markdown, no explanation."
    )

    # gpt-4.1 intentional: bullet quality directly impacts job applications; escalated per ROADMAP.md spec
    response = await _get_client().chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"ORIGINAL BULLET:\n{bullet}\n\n"
                    f"JOB DESCRIPTION (excerpt):\n{job_description[:3_000]}"
                ),
            },
        ],
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("rewrite_bullet: invalid JSON from GPT — %s", raw[:200])
        data = {}

    rewrites: list[str] = data.get("rewrites") or []
    return rewrites[:3]


async def generate_interview_questions(
    resume_text: str,
    job_description: str,
    job_title: str | None = None,
) -> dict:
    """
    Generate categorized interview questions from resume + job description.

    Returns:
        {
          "behavioral": list[str],
          "technical": list[str],
          "role_specific": list[str],
        }
    Raises on total failure so the calling route can return 502.
    """
    role_ctx = f" for a {job_title} role" if job_title else ""
    system = (
        f"You are an experienced technical interviewer. Generate interview questions{role_ctx} "
        "tailored to the candidate's resume and the job description. "
        "Return ONLY valid JSON with these exact keys:\n"
        "- behavioral: 4-5 behavioral/situational questions (STAR-method ready) (list of strings)\n"
        "- technical: 4-5 technical questions specific to the skills the role requires (list of strings)\n"
        "- role_specific: 3-4 questions about role fit, domain knowledge, or industry context (list of strings)\n"
        "Return only the JSON object — no markdown, no explanation."
    )

    response = await _get_client().chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"RESUME:\n{resume_text[:3_000]}\n\n"
                    f"JOB DESCRIPTION:\n{job_description[:3_000]}"
                ),
            },
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("generate_interview_questions: invalid JSON from GPT — %s", raw[:200])
        data = {}

    return {
        "behavioral": data.get("behavioral") or [],
        "technical": data.get("technical") or [],
        "role_specific": data.get("role_specific") or [],
    }
