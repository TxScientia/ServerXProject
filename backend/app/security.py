"""Shared security config.

Secrets are loaded from the environment. In development, a stable fallback is used
so the app runs out of the box, but a warning is emitted and the fallback must never
be used in production (set the env vars in the deployment).
"""
import os
import warnings

# --- JWT signing secret ---------------------------------------------------------
_DEV_SECRET = "dein_geheimer_schluessel"  # legacy dev fallback only
SECRET_KEY = os.getenv("SECRET_KEY", _DEV_SECRET)

if SECRET_KEY == _DEV_SECRET:
    warnings.warn(
        "SECRET_KEY is using the insecure development fallback. "
        "Set the SECRET_KEY environment variable in production.",
        stacklevel=2,
    )
