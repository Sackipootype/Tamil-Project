from __future__ import annotations

import argparse
import asyncio
import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi import Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from agent import run_local_demo, run_tamil_heritage_agent


load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
load_dotenv(Path(__file__).resolve().parent / ".env.local")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    mode: str = "heritage_explorer"
    voice_output: bool = False
    response_language: str = "bilingual"


class ChatResponse(BaseModel):
    answer: str


class SpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4500)
    language: Literal["tamil", "english", "bilingual"] = "english"


app = FastAPI(title="Tamil Heritage AI Agent", version="0.1.0")
STATIC_DIR = Path(__file__).resolve().parent / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "tamil-heritage-agent"}


@app.get("/api/capabilities")
async def capabilities() -> dict[str, bool]:
    return {
        "server_speech": bool(shutil.which("say") and shutil.which("afconvert")),
        "local_demo": True,
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    prompt = (
        f"Mode: {request.mode}\n"
        f"Response language preference: {request.response_language}\n"
        f"Voice output requested: {request.voice_output}\n"
        f"User: {request.message}"
    )
    try:
        answer = await run_tamil_heritage_agent(prompt)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Agent model call failed: {exc.__class__.__name__}. Check API quota, billing, model access, and network.",
        ) from exc
    return ChatResponse(answer=answer)


@app.post("/api/demo", response_model=ChatResponse)
async def demo_chat(request: ChatRequest) -> ChatResponse:
    prompt = (
        f"Mode: {request.mode}\n"
        f"Response language preference: {request.response_language}\n"
        f"Voice output requested: {request.voice_output}\n"
        f"User: {request.message}"
    )
    return ChatResponse(answer=run_local_demo(prompt, response_language=request.response_language))


def create_speech_file(text: str, language: str) -> FileResponse:
    voice = "Vani" if language == "tamil" else "Aman"
    text = " ".join(text.split())
    if not text:
        raise HTTPException(status_code=400, detail="Speech text is empty.")

    source = tempfile.NamedTemporaryFile(prefix="tamil-heritage-speech-", suffix=".aiff", delete=False)
    source_path = Path(source.name)
    source.close()
    output = tempfile.NamedTemporaryFile(prefix="tamil-heritage-speech-", suffix=".wav", delete=False)
    output_path = Path(output.name)
    output.close()

    try:
        subprocess.run(
            ["say", "-v", voice, "-o", str(source_path), text],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60,
        )
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16@22050", str(source_path), str(output_path)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60,
        )
    except subprocess.CalledProcessError as exc:
        source_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=f"Speech generation failed: {exc.stderr.strip()}") from exc
    except Exception as exc:
        source_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=f"Speech generation failed: {exc.__class__.__name__}") from exc
    finally:
        source_path.unlink(missing_ok=True)

    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename="tamil-heritage-answer.wav",
        background=BackgroundTask(lambda: output_path.unlink(missing_ok=True)),
    )


@app.post("/api/speech")
async def speech(request: SpeechRequest) -> FileResponse:
    return create_speech_file(request.text, request.language)


@app.get("/api/speech")
async def speech_get(
    text: str = Query(..., min_length=1, max_length=2400),
    language: Literal["tamil", "english", "bilingual"] = "english",
) -> FileResponse:
    return create_speech_file(text, language)


def cli() -> None:
    parser = argparse.ArgumentParser(description="Run the Tamil Heritage AI agent.")
    parser.add_argument(
        "message",
        nargs="?",
        default="Brihadeeswarar temple பற்றி explain pannunga",
        help="Question to ask the agent.",
    )
    parser.add_argument(
        "--local-demo",
        action="store_true",
        help="Run deterministic seed-data demo without calling the OpenAI API.",
    )
    args = parser.parse_args()
    if args.local_demo:
        print(run_local_demo(args.message))
        return
    try:
        print(asyncio.run(run_tamil_heritage_agent(args.message)))
    except Exception as exc:
        print(f"Agent model call failed: {exc.__class__.__name__}. Check API quota, billing, model access, and network.")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    if os.getenv("PORT"):
        import uvicorn

        uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.environ["PORT"]))
    else:
        cli()
