import asyncio
import os

import pytest
from app import configure_event_loop_policy
from app.main import checkpoint_connection_url
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

RUN_DATABASE_INTEGRATION = os.getenv("RUN_DATABASE_INTEGRATION") == "true"
configure_event_loop_policy()


@pytest.mark.skipif(
    not RUN_DATABASE_INTEGRATION,
    reason="Set RUN_DATABASE_INTEGRATION=true to exercise PostgreSQL checkpoint setup.",
)
@pytest.mark.anyio
async def test_postgres_checkpoint_setup() -> None:
    database_url = checkpoint_connection_url(os.environ["AGENT_RUNTIME_CHECKPOINT_DATABASE_URL"])

    async with AsyncPostgresSaver.from_conn_string(database_url) as checkpointer:
        await asyncio.wait_for(checkpointer.setup(), timeout=10)
        stored = await asyncio.wait_for(
            checkpointer.aget_tuple({"configurable": {"thread_id": "checkpoint-integration-test"}}),
            timeout=10,
        )

    assert stored is None
