# Tamil Heritage AI Agent

Runnable Python scaffold for a Tamil-first cultural heritage agent built with the OpenAI Agents SDK.

## What It Does

- Answers Tamil-first, then gives a full English translation.
- Website language selector supports Tamil-only, English-only, and bilingual answers.
- Uses an orchestrator agent with specialist agents for dynasties, architecture, monuments, education, and fact verification.
- Includes deterministic function tools for local seed knowledge, timelines, and basic claim verification.
- Exposes both a CLI and FastAPI endpoint.

## How To Use The Agent

1. Start the website/API:

```bash
cd tamil_heritage_agent
PORT=8000 .venv/bin/python main.py
```

2. Open the website:

```text
http://127.0.0.1:8000
```

3. Choose a language:

- `தமிழ்`: full Tamil interface and Tamil-only answers.
- `English`: full English interface and English-only answers.
- `தமிழ் + English`: Tamil-first bilingual answers.

4. Choose a mode:

- Heritage Explorer: general temple, dynasty, monument, and architecture questions.
- Research: essay or report-style answers.
- Timeline: chronological answers.
- Quiz: practice questions.
- Compare: side-by-side comparisons.

5. Ask a question or click a quick prompt.

The website tries the live OpenAI agent first. If the OpenAI project has quota or billing issues, it automatically falls back to `/api/demo`, which uses the local seed knowledge base.

Voice features:

- Turn on `Talk back` / `பேசட்டும்` before asking a question to have the answer read aloud automatically.
- Use the round mic button beside the composer to dictate a question when your browser supports speech recognition.
- Use the `Speak` / `மீண்டும் கேள்` button under any assistant answer to replay it.
- Tamil mode speaks with `ta-IN`; English mode speaks with `en-US`; bilingual mode reads Tamil first and then English.
- If the browser blocks autoplay, the site shows an audio player under the answer so you can press Play manually.
- On macOS, the server fallback uses the local `Vani` Tamil voice and `Aman` Indian English voice.

Accessibility features:

- Use `Tab` to move through language, mode, prompt buttons, mic, talk-back, and send controls.
- Press `Enter` in the message box to send; press `Shift` + `Enter` for a new line.
- A skip link appears when focused, letting keyboard users jump straight to chat.
- Status updates and new assistant messages are announced with live regions.
- The interface respects reduced-motion preferences.

## Local Setup

The workspace root contains `.env.local` with `OPENAI_API_KEY`.

Install dependencies:

```bash
cd tamil_heritage_agent
python -m pip install -e .
```

Run the CLI:

```bash
python main.py "சோழர் கட்டிடக்கலையை பற்றி சொல்லுங்கள்"
```

Run a deterministic local demo without calling the OpenAI API:

```bash
python main.py --local-demo "Brihadeeswarar temple பற்றி explain pannunga"
```

Run the API:

```bash
PORT=8000 python main.py
```

Open the website:

```text
http://127.0.0.1:8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Chat:

```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Brihadeeswarar temple பற்றி explain pannunga"}'
```

The website calls `/api/chat` first. If the OpenAI project has no quota available, it automatically falls back to `/api/demo`, which returns a Tamil-first response from the local seed knowledge base.

## Next Production Steps

- Replace `data/heritage_seed.json` with a RAG ingestion pipeline.
- Add vector search with Pinecone or Weaviate.
- Add PostgreSQL metadata and a knowledge graph.
- Add source ingestion from ASI, UNESCO, and academic references.
- Add voice input/output endpoints with OpenAI speech models.
- Add automated evals for Tamil-first format, citation integrity, and date accuracy.

## Runtime Notes

- Set `OPENAI_MODEL` to change the model. Default: `gpt-5.5`.
- If the live agent returns `insufficient_quota`, update the selected OpenAI Platform project's billing or quota.
