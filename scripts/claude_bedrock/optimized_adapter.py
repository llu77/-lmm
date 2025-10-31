"""
Optimized Bedrock Inference Adapter with Performance Enhancements
==================================================================

This module extends the InferenceAdapter with caching and batching capabilities
for improved performance and cost optimization.

Usage:
    from claude_bedrock import OptimizedInferenceAdapter

    adapter = OptimizedInferenceAdapter()

    # Use with caching
    response = adapter.invoke_model_cached("What is 2+2?")

    # Use with batching
    batch_results = adapter.invoke_batch([
        {"prompt": "Question 1", "max_tokens": 100},
        {"prompt": "Question 2", "max_tokens": 100}
    ])
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add parent directory to path to import performance module
sys.path.insert(0, str(Path(__file__).parent.parent))

from .inference_adapter import InferenceAdapter
from performance import PerformanceOptimizer


class OptimizedInferenceAdapter(InferenceAdapter):
    """
    Extended InferenceAdapter with performance optimizations.

    Features:
    - Prediction caching with TTL
    - Request batching for throughput
    - Configurable optimization settings
    """

    def __init__(
        self,
        region_name: str = 'us-east-1',
        model_id: Optional[str] = None,
        enable_cache: bool = True,
        enable_batching: bool = False,
        config_path: Optional[str] = None
    ):
        """
        Initialize the optimized inference adapter.

        Args:
            region_name: AWS region name
            model_id: Claude model ID
            enable_cache: Enable prediction caching
            enable_batching: Enable request batching
            config_path: Path to performance.json config
        """
        super().__init__(region_name, model_id)

        # Initialize performance optimizer
        self.optimizer = PerformanceOptimizer(config_path)
        self.cache_enabled = enable_cache and self.optimizer.cache_enabled
        self.batching_enabled = enable_batching and self.optimizer.batching_enabled

    def invoke_model_cached(
        self,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.0,
        force_refresh: bool = False
    ) -> Optional[str]:
        """
        Invoke model with caching support.

        Args:
            prompt: The user prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            force_refresh: Force cache refresh

        Returns:
            Model response (cached or fresh)

        Example:
            >>> adapter = OptimizedInferenceAdapter()
            >>> # First call - cache miss
            >>> response1 = adapter.invoke_model_cached("What is AI?")
            >>> # Second call - cache hit (much faster!)
            >>> response2 = adapter.invoke_model_cached("What is AI?")
        """
        if not self.cache_enabled:
            return self.invoke_model(prompt, max_tokens, temperature)

        # Create cache key from prompt and parameters
        cache_key = f"{prompt}|{max_tokens}|{temperature}|{self.model_id}"

        return self.optimizer.get_cached_or_compute(
            key=cache_key,
            compute_fn=lambda: self.invoke_model(prompt, max_tokens, temperature),
            force_refresh=force_refresh
        )

    def invoke_batch(
        self,
        requests: List[Dict[str, Any]],
        use_cache: bool = True
    ) -> List[Optional[str]]:
        """
        Invoke model for multiple prompts in batch.

        Args:
            requests: List of request dictionaries with keys:
                     - prompt: str (required)
                     - max_tokens: int (optional, default: 1000)
                     - temperature: float (optional, default: 0.0)
            use_cache: Use caching for individual requests

        Returns:
            List of model responses

        Example:
            >>> adapter = OptimizedInferenceAdapter()
            >>> requests = [
            ...     {"prompt": "What is AI?", "max_tokens": 100},
            ...     {"prompt": "What is ML?", "max_tokens": 100}
            ... ]
            >>> results = adapter.invoke_batch(requests)
        """
        results = []

        for request in requests:
            prompt = request.get("prompt")
            max_tokens = request.get("max_tokens", 1000)
            temperature = request.get("temperature", 0.0)

            if not prompt:
                results.append(None)
                continue

            if use_cache and self.cache_enabled:
                result = self.invoke_model_cached(
                    prompt, max_tokens, temperature
                )
            else:
                result = self.invoke_model(
                    prompt, max_tokens, temperature
                )

            results.append(result)

        return results

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        if not self.cache_enabled or not self.optimizer.cache:
            return {"enabled": False}

        return {
            "enabled": True,
            "size": self.optimizer.cache.size(),
            "max_entries": self.optimizer.cache.max_entries,
            "ttl_ms": self.optimizer.cache.ttl_ms
        }

    def clear_cache(self) -> None:
        """Clear all cached predictions."""
        if self.cache_enabled and self.optimizer.cache:
            self.optimizer.cache.clear()

    def cleanup_expired_cache(self) -> int:
        """
        Remove expired cache entries.

        Returns:
            Number of entries removed
        """
        if self.cache_enabled and self.optimizer.cache:
            return self.optimizer.cache.cleanup_expired()
        return 0
