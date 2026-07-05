"""Shared error helper.

Logs the real exception server-side and returns a generic, client-facing
HTTPException so internal details (DB/storage driver errors, table names,
Postgres error codes, stack context) never leak to callers.
"""
from fastapi import HTTPException


def internal_error(
    context: str,
    exc: Exception,
    *,
    status_code: int = 500,
    detail: str = "An internal error occurred.",
) -> HTTPException:
    """Return an HTTPException with a generic detail, logging the real cause.

    Usage:  raise internal_error("Failed to list users", e)
    """
    print(f"[ERROR] {context}: {exc}")
    return HTTPException(status_code=status_code, detail=detail)
