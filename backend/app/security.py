"""Shared security config.

Centralized here so there is a single place to swap for an env-var-backed secret
later (deferred security pass). Value is unchanged from the original inline constant.
"""

SECRET_KEY = "dein_geheimer_schluessel"  # TODO: load from environment (security pass)
