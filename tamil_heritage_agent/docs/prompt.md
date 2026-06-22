# Runtime Prompt

The main runtime prompt lives in `skills/tamil_heritage/instructions.md` and is loaded by `agent.py`.

The orchestrator must:

- Keep ownership of the final response.
- Use specialists as bounded tools.
- Produce Tamil first and English second.
- Include key facts, timeline, related monuments, quiz questions when useful, citations, and confidence.
- State source limitations when local seed data is insufficient.

