import asyncio
import sys


def configure_event_loop_policy() -> None:
    """Use the event loop required by psycopg async connections on Windows."""
    if sys.platform != "win32":
        return
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


configure_event_loop_policy()
