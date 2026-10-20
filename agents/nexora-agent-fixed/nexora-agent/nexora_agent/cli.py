"""Manual test loop:  python -m nexora_agent.cli"""

import asyncio
import sys

from nexora_agent.agent import Agent
from nexora_agent.catalog import make_catalog
from nexora_agent.config import Settings
from nexora_agent.llm import LLMUnavailable, make_llm


async def main() -> None:
    settings = Settings()
    llm = make_llm(settings)
    if llm is None:
        sys.exit("LLM is not configured. Copy .env.example to .env and fill in a provider (see README).")
    agent = Agent(llm, make_catalog(settings), settings)
    history: list[dict] = []
    print("دستیار نکسورا (خروج: Ctrl+C)\n")
    while True:
        try:
            text = input("شما: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not text:
            continue
        history.append({"role": "user", "content": text})
        try:
            reply = await agent.respond(history)
        except LLMUnavailable as error:
            print(f"[خطا: {error}]")
            history.pop()
            continue
        history.append({"role": "assistant", "content": reply.text})
        print(f"\nدستیار: {reply.text}\n")
        for action in reply.actions:
            print(f"  [دکمه] افزودن به سبد: {action['productName']} × {action['quantity']}")
        for card in reply.products:
            print(f"  [کارت] {card['name']} — {card['priceText']}")
        print()


if __name__ == "__main__":
    asyncio.run(main())
