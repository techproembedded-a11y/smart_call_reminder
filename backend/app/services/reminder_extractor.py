import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# Heuristic patterns for Tamil, Tanglish, and English
PATTERNS = {
    "emergency": [
        r"\b(emergency|urgent|avsaram|udane|seekiram|asap|today itself)\b",
        r"\b(innaikke|inikey|inikku)\s+(mudikkanum|pannanum|thevanum)\b"
    ],
    "today": [
        r"\b(today|innaikke|inikey|inikku|tonight)\b"
    ],
    "tomorrow": [
        r"\b(tomorrow|naalaikku|nalaiku|nalaikki)\b"
    ],
    "two_days": [
        r"\b(two\s*days?|2\s*days?|rendu\s*naal(a)?)\b"
    ],
    "three_days": [
        r"\b(three\s*days?|3\s*days?|moonu\s*naal(a)?)\b"
    ],
    "five_days": [
        r"\b(five\s*days?|5\s*days?|anju\s*naal(a)?|aindhu\s*naal(a)?)\b"
    ],
    "action_quotation": [
        r"\bquotation\b",
        r"\bestimate\b"
    ],
    "action_call": [
        r"\b(call|pesanum|call\s*pannanum|ring|contact)\b"
    ],
    "action_payment": [
        r"\b(payment|invoice|bill|amount|kaasu|panam)\b"
    ],
    "action_document": [
        r"\b(doc|document|file|report|agreement|contract)\b"
    ],
    "action_meeting": [
        r"\b(meeting|meet|visit|appointment)\b"
    ]
}

def extract_with_rules(transcript: str, ref_time: datetime) -> Dict[str, Any]:
    text_lower = transcript.lower()

    # 1. Determine priority and due date
    priority = "due_today"
    due_datetime = ref_time + timedelta(hours=4)  # default: later today
    explanation_parts = []

    # Check emergency
    is_emergency = any(re.search(p, text_lower) for p in PATTERNS["emergency"])
    if is_emergency:
        priority = "emergency"
        # Emergency defaults to current hour / immediate
        due_datetime = ref_time + timedelta(hours=1)
        explanation_parts.append("Emergency/Urgent keywords detected")
    # Check 5 days
    elif any(re.search(p, text_lower) for p in PATTERNS["five_days"]):
        priority = "5_day"
        due_datetime = ref_time + timedelta(days=5)
        explanation_parts.append("5-day deadline detected ('five days / anju naal')")
    # Check 3 days
    elif any(re.search(p, text_lower) for p in PATTERNS["three_days"]):
        priority = "3_day"
        due_datetime = ref_time + timedelta(days=3)
        explanation_parts.append("3-day deadline detected ('three days / moonu naal')")
    # Check 2 days
    elif any(re.search(p, text_lower) for p in PATTERNS["two_days"]):
        priority = "2_day"
        due_datetime = ref_time + timedelta(days=2)
        explanation_parts.append("2-day deadline detected ('two days / rendu naal')")
    # Check tomorrow
    elif any(re.search(p, text_lower) for p in PATTERNS["tomorrow"]):
        priority = "due_today"
        due_datetime = ref_time + timedelta(days=1)
        explanation_parts.append("Tomorrow deadline detected ('naalaikku')")
    # Check today
    elif any(re.search(p, text_lower) for p in PATTERNS["today"]):
        priority = "due_today"
        due_datetime = ref_time + timedelta(hours=3)
        explanation_parts.append("Today deadline detected ('today / innaikke')")

    # 2. Extract Task Title
    task_title = ""
    if any(re.search(p, text_lower) for p in PATTERNS["action_quotation"]):
        task_title = "Send quotation"
    elif any(re.search(p, text_lower) for p in PATTERNS["action_payment"]):
        task_title = "Follow up on payment / invoice"
    elif any(re.search(p, text_lower) for p in PATTERNS["action_call"]):
        task_title = "Call back and follow up"
    elif any(re.search(p, text_lower) for p in PATTERNS["action_document"]):
        task_title = "Send document / report"
    elif any(re.search(p, text_lower) for p in PATTERNS["action_meeting"]):
        task_title = "Schedule & attend meeting"

    # If no specific action matched, synthesize from transcript
    if not task_title:
        # Clean common stopwords and take first 5-8 words
        cleaned = re.sub(r"[,\.\?\!]", " ", transcript).strip()
        words = cleaned.split()
        if len(words) > 0:
            task_title = " ".join(words[:6]).capitalize()
        else:
            task_title = "Follow up on call"

    return {
        "task_title": task_title,
        "due_datetime": due_datetime,
        "priority": priority,
        "confidence": 0.85 if is_emergency or "deadline detected" in " ".join(explanation_parts) else 0.70,
        "explanation": "; ".join(explanation_parts) if explanation_parts else "Default deadline inferred from voice note",
        "notes": transcript
    }

async def extract_reminder_details(
    transcript: str,
    phone_number: Optional[str] = None,
    call_datetime: Optional[datetime] = None,
    timezone_str: str = "Asia/Kolkata"
) -> Dict[str, Any]:
    ref_time = call_datetime or datetime.now(timezone.utc)
    if ref_time.tzinfo is None:
        ref_time = ref_time.replace(tzinfo=timezone.utc)

    # First run heuristic extraction
    heuristic_res = extract_with_rules(transcript, ref_time)
    heuristic_res["phone_number"] = phone_number

    # If Groq or OpenAI key is available, we can optionally enhance using LLM
    groq_key = settings.GROQ_API_KEY
    openai_key = settings.OPENAI_API_KEY

    if groq_key or openai_key:
        try:
            prompt = (
                f"You are an assistant parsing call notes and voice transcripts (Tamil, Tanglish, English).\n"
                f"Current reference datetime: {ref_time.isoformat()}.\n"
                f"Input transcript: \"{transcript}\"\n\n"
                f"Extract:\n"
                f"1. Actionable task title (concise, e.g. 'Send quotation', 'Follow up on payment')\n"
                f"2. Priority (choose one strictly: 'emergency', 'due_today', '2_day', '3_day', '5_day')\n"
                f"3. Due date offset in days from reference datetime (integer: 0 for today, 1 for tomorrow, etc.)\n"
                f"Reply ONLY in JSON format:\n"
                f'{{"task_title": "...", "priority": "...", "days_offset": 0, "explanation": "..."}}'
            )

            if groq_key:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {groq_key}"},
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [{"role": "user", "content": prompt}],
                            "temperature": 0.1,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if resp.status_code == 200:
                        import json
                        llm_data = json.loads(resp.json()["choices"][0]["message"]["content"])
                        days_offset = int(llm_data.get("days_offset", 0))
                        llm_priority = llm_data.get("priority", heuristic_res["priority"])
                        if llm_priority not in ("emergency", "due_today", "2_day", "3_day", "5_day"):
                            llm_priority = heuristic_res["priority"]
                        return {
                            "task_title": llm_data.get("task_title", heuristic_res["task_title"]),
                            "phone_number": phone_number,
                            "due_datetime": ref_time + timedelta(days=days_offset),
                            "priority": llm_priority,
                            "confidence": 0.95,
                            "explanation": llm_data.get("explanation", "AI extracted from transcript"),
                            "notes": transcript
                        }
        except Exception as e:
            logger.warning(f"LLM reminder extraction failed, falling back to heuristic: {e}")

    return heuristic_res
