from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from agents import Agent, Runner, function_tool


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "heritage_seed.json"
INSTRUCTIONS_PATH = ROOT / "skills" / "tamil_heritage" / "instructions.md"
MODEL = os.getenv("OPENAI_MODEL", "gpt-5.5")


def _load_data() -> dict[str, Any]:
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _matches(query: str, record: dict[str, Any]) -> bool:
    haystack = " ".join(str(value) for value in record.values() if not isinstance(value, list))
    haystack += " " + " ".join(str(item) for value in record.values() if isinstance(value, list) for item in value)
    return query.lower() in haystack.lower()


@function_tool
def search_heritage_knowledge(query: str) -> str:
    """Search the curated Tamil Heritage seed knowledge base for monuments, dynasties, and styles."""
    data = _load_data()
    results: list[dict[str, Any]] = []
    for collection_name in ("monuments", "dynasties", "styles"):
        for record in data.get(collection_name, []):
            if _matches(query, record):
                results.append({"type": collection_name[:-1], **record})
    if not results:
        return json.dumps(
            {
                "query": query,
                "results": [],
                "note": "No local seed match. Use the final answer to say broader RAG ingestion is required for stronger citations.",
            },
            ensure_ascii=False,
        )
    return json.dumps({"query": query, "results": results[:8]}, ensure_ascii=False, indent=2)


@function_tool
def build_timeline(entity: str) -> str:
    """Build a compact timeline for a known monument or dynasty from curated local data."""
    data = _load_data()
    events: list[str] = []
    for monument in data.get("monuments", []):
        if _matches(entity, monument):
            events.append(f"{monument['period']}: {monument['name_en']} / {monument['name_ta']} ({monument['dynasty']})")
    for dynasty in data.get("dynasties", []):
        if _matches(entity, dynasty):
            events.append(f"{dynasty['period']}: {dynasty['name_en']} / {dynasty['name_ta']} influence in {dynasty['region']}")
    return json.dumps({"entity": entity, "timeline": events}, ensure_ascii=False, indent=2)


@function_tool
def verify_claims(claims: list[str]) -> str:
    """Assign simple confidence levels by checking claims against the curated seed knowledge."""
    data_text = json.dumps(_load_data(), ensure_ascii=False).lower()
    verified = []
    for claim in claims:
        tokens = [token.strip(".,;:()[]{}").lower() for token in claim.split() if len(token.strip(".,;:()[]{}")) > 3]
        matches = sum(1 for token in tokens if token in data_text)
        if matches >= 3:
            level = "high"
            reason = "Claim overlaps with multiple curated seed records."
        elif matches >= 1:
            level = "medium"
            reason = "Claim partially overlaps with curated seed records."
        else:
            level = "low"
            reason = "Claim is not supported by the local seed data."
        verified.append({"claim": claim, "confidence": level, "reason": reason})
    return json.dumps({"verified_claims": verified}, ensure_ascii=False, indent=2)


dynasty_agent = Agent(
    name="Dynasty Research Agent",
    handoff_description="Researches Indian dynasties, rulers, timelines, and architectural influence.",
    instructions=(
        "You are a dynasty historian for Tamil Heritage AI. Use search_heritage_knowledge and build_timeline. "
        "Focus on dynasties, rulers, time periods, cultural context, and architectural influence. "
        "Return concise evidence for the Orchestrator."
    ),
    tools=[search_heritage_knowledge, build_timeline],
    model=MODEL,
)

architecture_agent = Agent(
    name="Architecture Analysis Agent",
    handoff_description="Explains temple architecture styles, structures, construction methods, and terminology.",
    instructions=(
        "You are an Indian architecture analyst. Explain styles such as Dravidian, Nagara, Vesara, "
        "Indo-Islamic, and Mughal architecture. Preserve terms like Gopuram, Vimana, Mandapa, and Garbhagriha."
    ),
    tools=[search_heritage_knowledge],
    model=MODEL,
)

monument_agent = Agent(
    name="Monument Intelligence Agent",
    handoff_description="Builds monument profiles with history, design features, timelines, and related monuments.",
    instructions=(
        "You are a monument intelligence specialist. Use the local knowledge tool first, then summarize "
        "monument significance, patronage, architecture, related monuments, and source limitations."
    ),
    tools=[search_heritage_knowledge, build_timeline],
    model=MODEL,
)

education_agent = Agent(
    name="Educational Content Agent",
    handoff_description="Creates study guides, essays, quiz questions, and student-friendly learning material.",
    instructions=(
        "You create educational material for students. Include clear Tamil explanations, simple English translation, "
        "quiz questions, answer keys when requested, and concise study structure."
    ),
    tools=[search_heritage_knowledge],
    model=MODEL,
)

verification_agent = Agent(
    name="Citation and Fact Verification Agent",
    handoff_description="Checks claims and assigns confidence using available evidence.",
    instructions=(
        "You verify claims against available evidence. Use verify_claims. Never invent citations. "
        "Mark missing evidence clearly and suggest broader RAG ingestion when the local seed is insufficient."
    ),
    tools=[verify_claims],
    model=MODEL,
)


def _base_instructions() -> str:
    domain_rules = INSTRUCTIONS_PATH.read_text(encoding="utf-8")
    return f"""
You are the Orchestrator Agent for Tamil Heritage AI.

Coordinate specialist agents and tools to answer questions about Indian architectural heritage,
temples, monuments, dynasties, cultural evolution, art, sculpture, and historical timelines.

Use the specialist agents as tools when helpful. Keep ownership of the final response.

{domain_rules}
"""


orchestrator_agent = Agent(
    name="Tamil Heritage AI Orchestrator",
    instructions=_base_instructions(),
    tools=[
        search_heritage_knowledge,
        build_timeline,
        verify_claims,
        dynasty_agent.as_tool(
            tool_name="consult_dynasty_research_agent",
            tool_description="Research a dynasty, ruler, period, or architectural influence.",
        ),
        architecture_agent.as_tool(
            tool_name="consult_architecture_analysis_agent",
            tool_description="Analyze an architectural style, feature, structure, or comparison.",
        ),
        monument_agent.as_tool(
            tool_name="consult_monument_intelligence_agent",
            tool_description="Create a monument profile with history, architecture, timeline, and related sites.",
        ),
        education_agent.as_tool(
            tool_name="consult_educational_content_agent",
            tool_description="Generate quizzes, study guides, essays, and classroom-ready learning material.",
        ),
        verification_agent.as_tool(
            tool_name="consult_citation_fact_verification_agent",
            tool_description="Verify factual claims and assign confidence before final output.",
        ),
    ],
    model=MODEL,
)


async def run_tamil_heritage_agent(message: str) -> str:
    result = await Runner.run(orchestrator_agent, message)
    return str(result.final_output)


def run_local_demo(message: str, response_language: str = "bilingual") -> str:
    """Return a deterministic Tamil-first demo response without calling the OpenAI API."""
    data = _load_data()
    query = message.lower()
    monument = next((item for item in data["monuments"] if item["id"] in query or item["name_en"].lower() in query), None)
    if monument is None and "brihadeeswarar" in query:
        monument = data["monuments"][0]
    if monument is None:
        monument = data["monuments"][0]

    tamil_names = {
        "Brihadeeswarar Temple": "பிரகதீஸ்வரர் கோவில்",
        "Gangaikonda Cholapuram Temple": "கங்கைகொண்ட சோழபுரம் கோவில்",
        "Airavatesvara Temple": "ஐராவதேஸ்வரர் கோவில்",
        "Shore Temple": "கடற்கரை கோவில்",
        "Konark Sun Temple": "கோணார்க் சூரிய கோவில்",
        "Pancha Rathas": "பஞ்ச ரதங்கள்",
        "Arjuna's Penance": "அர்ஜுனன் தவம்",
        "Srirangam Temple": "ஸ்ரீரங்கம் கோவில்",
        "Ramanathaswamy Temple": "ராமநாதசுவாமி கோவில்",
    }
    tamil_sources = {
        "UNESCO World Heritage documentation": "யுனெஸ்கோ உலக பாரம்பரிய ஆவணங்கள்",
        "Archaeological Survey of India records": "இந்திய தொல்லியல் ஆய்வு பதிவுகள்",
        "Temple architecture references": "கோவில் கட்டிடக்கலை குறிப்புகள்",
        "Tamil Nadu heritage records": "தமிழ்நாடு பாரம்பரிய பதிவுகள்",
    }
    fact_translations = {
        "A major Shiva temple in Thanjavur.": "தஞ்சாவூரில் அமைந்துள்ள முக்கியமான சிவன் கோவில்.",
        "Associated with Rajaraja Chola I.": "முதலாம் இராஜராஜ சோழனுடன் தொடர்புடையது.",
        "Part of the UNESCO Great Living Chola Temples grouping.": "யுனெஸ்கோவின் Great Living Chola Temples தொகுப்பின் ஒரு பகுதியாகும்.",
        "Located near the Bay of Bengal at Mahabalipuram.": "மகாபலிபுரத்தில் வங்காள விரிகுடா அருகே அமைந்துள்ளது.",
        "Associated with Pallava stone temple architecture.": "பல்லவர் கால கல் கோவில் கட்டிடக்கலையுடன் தொடர்புடையது.",
        "Part of the UNESCO Group of Monuments at Mahabalipuram.": "மகாபலிபுரம் நினைவுச்சின்னங்களின் யுனெஸ்கோ தொகுப்பின் ஒரு பகுதியாகும்.",
        "A major temple complex in Madurai.": "மதுரையில் அமைந்துள்ள முக்கியமான கோவில் தொகுப்பு.",
        "Known for large gopurams and sculptural programs.": "பெரிய கோபுரங்கள் மற்றும் சிற்ப வேலைப்பாடுகளுக்குப் புகழ்பெற்றது.",
        "Closely tied to Tamil devotional and urban culture.": "தமிழ் பக்தி மரபும் நகர்ப்புற பண்பாடும் இதனுடன் நெருக்கமாக இணைந்துள்ளன.",
        "Dedicated to Surya, the sun god.": "சூரிய பகவானுக்காக அர்ப்பணிக்கப்பட்டது.",
        "Conceived as a monumental stone chariot.": "பெரும் கல் தேரைப் போன்ற நினைவுச்சின்னமாக வடிவமைக்கப்பட்டது.",
        "A UNESCO World Heritage Site.": "யுனெஸ்கோ உலக பாரம்பரிய தளம்.",
    }

    facts_ta = "\n".join(f"- {fact_translations.get(fact, fact)}" for fact in monument["facts"])
    facts_en = "\n".join(f"- {fact}" for fact in monument["facts"])
    related = "\n".join(f"- {item}" for item in monument["related"])
    related_ta = "\n".join(f"- {tamil_names.get(item, item)}" for item in monument["related"])
    citations = "\n".join(f"- {source}" for source in monument["sources"])
    citations_ta = "\n".join(f"- {tamil_sources.get(source, source)}" for source in monument["sources"])

    tamil_answer = f"""தமிழில் விளக்கம்

{monument['name_ta']} {monument['location']} பகுதியில் அமைந்துள்ள முக்கியமான இந்திய பாரம்பரிய நினைவுச்சின்னமாகும். இது {monument['dynasty']} மரபுடன் தொடர்புடையது. இதன் கட்டிடக்கலை பாணி {monument['style']} என அடையாளப்படுத்தப்படுகிறது. இந்த உள்ளூர் டெமோ பதிப்பு seed data-வை மட்டும் பயன்படுத்துகிறது; production RAG இணைக்கப்பட்டால் ASI, UNESCO, academic sources போன்ற விரிவான ஆதாரங்கள் சேர்க்கப்படும்.

முக்கிய தகவல்கள்
{facts_ta}

காலவரிசை
- {monument['period']}: {monument['name_ta']}

தொடர்புடைய நினைவுச்சின்னங்கள்
{related_ta}

வினாடி வினா
- {monument['name_ta']} எந்த மரபுடன் தொடர்புடையது?
- {monument['name_ta']} எந்த கட்டிடக்கலை பாணியுடன் தொடர்புடையது?

மேற்கோள்கள்
{citations_ta}

நம்பகத்தன்மை
நடுத்தரம்: உள்ளூர் curated seed data ஆதாரமாக உள்ளது. Production நிலை சரிபார்ப்புக்கு விரிவான RAG source ingestion பரிந்துரைக்கப்படுகிறது.
"""

    english_answer = f"""English Explanation

{monument['name_en']} is an important Indian heritage monument located in {monument['location']}. It is associated with the {monument['dynasty']} tradition. Its architectural style is identified as {monument['style']}. This local demo uses only the bundled seed data; a production RAG system would add broader ASI, UNESCO, and academic sources.

Key Facts
{facts_en}

Timeline
- {monument['period']}: {monument['name_en']}

Related Monuments
{related}

Quiz Questions
- Which historical tradition is {monument['name_en']} associated with?
- Which architectural style is associated with {monument['name_en']}?

Citations
{citations}

Confidence
Medium: Supported by local curated seed data. Broader RAG source ingestion is recommended for production-grade verification.
"""

    if response_language == "tamil":
        return tamil_answer
    if response_language == "english":
        return english_answer

    return f"""தமிழில் விளக்கம்

{monument['name_ta']} {monument['location']} பகுதியில் அமைந்துள்ள முக்கியமான இந்திய பாரம்பரிய நினைவுச்சின்னமாகும். இது {monument['dynasty']} மரபுடன் தொடர்புடையது. இதன் கட்டிடக்கலை பாணி {monument['style']} என அடையாளப்படுத்தப்படுகிறது. இந்த உள்ளூர் டெமோ பதிப்பு seed data-வை மட்டும் பயன்படுத்துகிறது; production RAG இணைக்கப்பட்டால் ASI, UNESCO, academic sources போன்ற விரிவான ஆதாரங்கள் சேர்க்கப்படும்.

English Translation

{monument['name_en']} is an important Indian heritage monument located in {monument['location']}. It is associated with the {monument['dynasty']} tradition. Its architectural style is identified as {monument['style']}. This local demo uses only the bundled seed data; a production RAG system would add broader ASI, UNESCO, and academic sources.

Key Facts
{facts_en}

Timeline
- {monument['period']}: {monument['name_en']} / {monument['name_ta']}

Related Monuments
{related}

Quiz Questions (Optional)
- {monument['name_ta']} எந்த மரபுடன் தொடர்புடையது?
- Which architectural style is associated with {monument['name_en']}?

Citations
{citations}

Confidence
Medium: Supported by local curated seed data. Broader RAG source ingestion is recommended for production-grade verification.
"""
