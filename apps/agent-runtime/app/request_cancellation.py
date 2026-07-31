import asyncio
from collections.abc import Awaitable
from contextlib import suppress
from typing import TypeVar

from fastapi import Request

T = TypeVar("T")


class RequestCancelledError(Exception):
    """Raised when the upstream HTTP client disconnects before completion."""


async def cancel_when_disconnected(request: Request, operation: Awaitable[T]) -> T:
    operation_task = asyncio.ensure_future(operation)
    disconnect_task = asyncio.create_task(wait_for_disconnect(request))
    try:
        done, _ = await asyncio.wait(
            [operation_task, disconnect_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        if operation_task in done:
            return operation_task.result()
        disconnect_task.result()
        operation_task.cancel()
        with suppress(asyncio.CancelledError):
            await operation_task
        raise RequestCancelledError
    except asyncio.CancelledError:
        if not operation_task.done():
            operation_task.cancel()
            with suppress(asyncio.CancelledError):
                await operation_task
        raise
    finally:
        if not disconnect_task.done():
            disconnect_task.cancel()
            with suppress(asyncio.CancelledError):
                await disconnect_task


async def wait_for_disconnect(request: Request) -> None:
    while True:
        message = await request.receive()
        if message["type"] == "http.disconnect":
            return
