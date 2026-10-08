import time
import logging
from typing import Optional
from collections import defaultdict
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("rage.redis")

class RedisManager:
    def __init__(self):
        self.client: Optional[aioredis.Redis] = None
        self._memory_cache = defaultdict(list)

    async def connect(self):
        if settings.REDIS_URL:
            try:
                self.client = aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2
                )
                await self.client.ping()
                logger.info("Successfully connected to Redis instance")
            except Exception as e:
                logger.warning(f"Redis unavailable ({e}). Falling back to in-memory rate limiting.")
                self.client = None

    async def disconnect(self):
        if self.client:
            await self.client.close()

    async def check_rate_limit(self, key: str, max_requests: int = 100, window_seconds: int = 60) -> bool:
        """
        Sliding window rate limiter. Returns True if allowed, False if limit exceeded.
        """
        now = time.time()
        if self.client:
            try:
                pipe = self.client.pipeline()
                current_window_key = f"rate:{key}"
                # Remove timestamps older than window
                pipe.zremrangebyscore(current_window_key, 0, now - window_seconds)
                # Add current timestamp
                pipe.zadd(current_window_key, {str(now): now})
                # Count elements in window
                pipe.zcard(current_window_key)
                # Expire key after window
                pipe.expire(current_window_key, window_seconds)
                results = await pipe.execute()
                request_count = results[2]
                return request_count <= max_requests
            except Exception as e:
                logger.warning(f"Redis rate limit error ({e}), falling back to memory")

        # Memory fallback
        timestamps = self._memory_cache[key]
        cutoff = now - window_seconds
        self._memory_cache[key] = [t for t in timestamps if t > cutoff]
        if len(self._memory_cache[key]) >= max_requests:
            return False
        self._memory_cache[key].append(now)
        return True

redis_manager = RedisManager()
