"""Cache manager for application."""
import json
from datetime import datetime, timedelta
from typing import Any

from app.config import settings


class CacheManager:
    """Simple in-memory cache manager with TTL support."""

    def __init__(self):
        """Initialize cache."""
        self._cache: dict[str, tuple[Any, datetime]] = {}

    def get(self, key: str) -> Any | None:
        """Get value from cache."""
        if key not in self._cache:
            return None

        value, expires_at = self._cache[key]
        if datetime.utcnow() > expires_at:
            del self._cache[key]
            return None

        return value

    def set(self, key: str, value: Any, ttl: int):
        """Set value in cache with TTL in seconds."""
        expires_at = datetime.utcnow() + timedelta(seconds=ttl)
        self._cache[key] = (value, expires_at)

    def delete(self, key: str):
        """Delete key from cache."""
        if key in self._cache:
            del self._cache[key]

    def clear(self):
        """Clear all cache."""
        self._cache.clear()

    def delete_pattern(self, pattern: str):
        """Delete keys matching pattern."""
        keys_to_delete = [key for key in self._cache.keys() if pattern in key]
        for key in keys_to_delete:
            del self._cache[key]


# Global cache instance
cache = CacheManager()


def get_cache_key(prefix: str, *args) -> str:
    """Generate cache key."""
    parts = [prefix] + [str(arg) for arg in args]
    return ":".join(parts)
