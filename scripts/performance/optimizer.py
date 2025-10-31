"""
Performance Optimization Utilities
===================================

This module provides utilities for optimizing AI/ML inference performance:
- Prediction caching with TTL
- Request batching for throughput optimization
- Configuration management

Usage:
    from performance import PerformanceOptimizer

    optimizer = PerformanceOptimizer()

    # Use caching
    result = optimizer.cache.get("prompt_hash")
    if result is None:
        result = call_model()
        optimizer.cache.set("prompt_hash", result)

    # Use batching
    batch = optimizer.batcher.add_request(request_data)
    if batch.is_ready():
        results = process_batch(batch.get_requests())
"""

import json
import time
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable
from collections import OrderedDict
from threading import Lock, Timer
import asyncio


class PredictionCache:
    """
    LRU cache with TTL for storing prediction results.

    Features:
    - Least Recently Used (LRU) eviction
    - Time-to-live (TTL) for entries
    - Thread-safe operations
    - Automatic cleanup of expired entries
    """

    def __init__(self, max_entries: int = 10000, ttl_ms: int = 300000):
        """
        Initialize the prediction cache.

        Args:
            max_entries: Maximum number of entries to store
            ttl_ms: Time-to-live in milliseconds
        """
        self.max_entries = max_entries
        self.ttl_ms = ttl_ms
        self.cache: OrderedDict = OrderedDict()
        self.lock = Lock()

    def _hash_key(self, key: Any) -> str:
        """Generate a hash for the cache key."""
        if isinstance(key, str):
            return hashlib.sha256(key.encode()).hexdigest()
        return hashlib.sha256(str(key).encode()).hexdigest()

    def get(self, key: Any) -> Optional[Any]:
        """
        Get a value from the cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or expired
        """
        with self.lock:
            hashed_key = self._hash_key(key)

            if hashed_key not in self.cache:
                return None

            value, timestamp = self.cache[hashed_key]

            # Check if expired
            if (time.time() * 1000) - timestamp > self.ttl_ms:
                del self.cache[hashed_key]
                return None

            # Move to end (most recently used)
            self.cache.move_to_end(hashed_key)
            return value

    def set(self, key: Any, value: Any) -> None:
        """
        Set a value in the cache.

        Args:
            key: Cache key
            value: Value to cache
        """
        with self.lock:
            hashed_key = self._hash_key(key)

            # Add new entry with timestamp
            self.cache[hashed_key] = (value, time.time() * 1000)
            self.cache.move_to_end(hashed_key)

            # Evict oldest if over limit
            if len(self.cache) > self.max_entries:
                self.cache.popitem(last=False)

    def clear(self) -> None:
        """Clear all cache entries."""
        with self.lock:
            self.cache.clear()

    def size(self) -> int:
        """Get current cache size."""
        with self.lock:
            return len(self.cache)

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries.

        Returns:
            Number of entries removed
        """
        with self.lock:
            current_time = time.time() * 1000
            expired_keys = [
                key for key, (_, timestamp) in self.cache.items()
                if current_time - timestamp > self.ttl_ms
            ]

            for key in expired_keys:
                del self.cache[key]

            return len(expired_keys)


class RequestBatcher:
    """
    Batches requests together to improve throughput.

    Features:
    - Automatic flushing based on size or time
    - Thread-safe batch management
    - Async and sync support
    """

    def __init__(
        self,
        max_batch_size: int = 100,
        max_wait_time_ms: int = 50,
        callback: Optional[Callable] = None
    ):
        """
        Initialize the request batcher.

        Args:
            max_batch_size: Maximum requests per batch
            max_wait_time_ms: Maximum wait time before processing batch
            callback: Optional callback function to call when batch is ready
        """
        self.max_batch_size = max_batch_size
        self.max_wait_time_ms = max_wait_time_ms
        self.callback = callback
        self.current_batch: List[Any] = []
        self.lock = Lock()
        self.timer: Optional[Timer] = None

    def add(self, request: Any) -> Optional[List[Any]]:
        """
        Add a request to the current batch.

        Args:
            request: Request to add to batch

        Returns:
            Full batch if ready to process, None otherwise
        """
        with self.lock:
            self.current_batch.append(request)

            # Cancel existing timer
            if self.timer:
                self.timer.cancel()

            # Check if batch is full
            if len(self.current_batch) >= self.max_batch_size:
                batch = self.current_batch
                self.current_batch = []
                if self.callback:
                    self.callback(batch)
                return batch

            # Start new timer
            self.timer = Timer(
                self.max_wait_time_ms / 1000.0,
                self._flush_on_timeout
            )
            self.timer.start()

            return None

    def _flush_on_timeout(self) -> None:
        """Flush batch when timeout is reached."""
        with self.lock:
            if self.current_batch:
                batch = self.current_batch
                self.current_batch = []
                if self.callback:
                    self.callback(batch)

    def flush(self) -> List[Any]:
        """
        Manually flush the current batch.

        Returns:
            Current batch
        """
        with self.lock:
            if self.timer:
                self.timer.cancel()
            batch = self.current_batch
            self.current_batch = []
            return batch

    def size(self) -> int:
        """Get current batch size."""
        with self.lock:
            return len(self.current_batch)


class PerformanceOptimizer:
    """
    Main performance optimizer with integrated caching and batching.

    Usage:
        optimizer = PerformanceOptimizer()

        # Check cache first
        result = optimizer.get_cached_or_compute(
            key="my_prompt",
            compute_fn=lambda: expensive_operation()
        )

        # Add to batch
        optimizer.add_to_batch(request_data)
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the performance optimizer.

        Args:
            config_path: Path to performance.json config file
        """
        # Load configuration
        if config_path is None:
            # Default to config/performance.json relative to project root
            config_path = Path(__file__).parent.parent.parent / "config" / "performance.json"

        with open(config_path) as f:
            self.config = json.load(f)

        # Initialize cache
        cache_config = self.config.get("predictionCache", {})
        self.cache_enabled = cache_config.get("enabled", True)
        if self.cache_enabled:
            self.cache = PredictionCache(
                max_entries=cache_config.get("maxEntries", 10000),
                ttl_ms=cache_config.get("ttl", 300000)
            )
        else:
            self.cache = None

        # Initialize batcher
        batch_config = self.config.get("batching", {})
        self.batching_enabled = batch_config.get("enabled", True)
        if self.batching_enabled:
            self.batcher = RequestBatcher(
                max_batch_size=batch_config.get("maxBatchSize", 100),
                max_wait_time_ms=batch_config.get("maxWaitTime", 50)
            )
        else:
            self.batcher = None

    def get_cached_or_compute(
        self,
        key: Any,
        compute_fn: Callable,
        force_refresh: bool = False
    ) -> Any:
        """
        Get result from cache or compute if not found.

        Args:
            key: Cache key
            compute_fn: Function to call if cache miss
            force_refresh: Force recomputation even if cached

        Returns:
            Cached or computed result
        """
        if not force_refresh and self.cache_enabled and self.cache:
            cached = self.cache.get(key)
            if cached is not None:
                return cached

        # Compute result
        result = compute_fn()

        # Cache result
        if self.cache_enabled and self.cache:
            self.cache.set(key, result)

        return result

    def add_to_batch(self, request: Any) -> Optional[List[Any]]:
        """
        Add request to batch.

        Args:
            request: Request to batch

        Returns:
            Full batch if ready, None otherwise
        """
        if self.batching_enabled and self.batcher:
            return self.batcher.add(request)
        return [request]

    def get_config(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value.

        Args:
            key: Config key (dot notation supported, e.g., "batching.maxBatchSize")
            default: Default value if not found

        Returns:
            Configuration value
        """
        keys = key.split(".")
        value = self.config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value
