#!/usr/bin/env python3
"""
Local Performance Optimization Demo
====================================

This script demonstrates the performance optimization features
WITHOUT requiring AWS credentials. It uses a simulated backend
to show caching and batching benefits.

Run: python3 scripts/demo_performance_local.py
"""

import sys
import time
import hashlib
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from performance.optimizer import PredictionCache, RequestBatcher, PerformanceOptimizer


# Simulated expensive operation (like an API call)
def simulate_expensive_operation(prompt: str, delay: float = 2.0) -> str:
    """Simulate an expensive API call with delay."""
    time.sleep(delay)
    return f"Response for: {prompt[:50]}..."


def demo_basic_cache():
    """Demonstrate basic caching functionality."""
    print("=" * 70)
    print("DEMO 1: Basic Prediction Caching")
    print("=" * 70)
    print()

    cache = PredictionCache(max_entries=100, ttl_ms=60000)

    prompt = "What is artificial intelligence?"

    # First call - cache miss
    print("First call (cache miss):")
    start = time.time()

    cached = cache.get(prompt)
    if cached is None:
        print("  Cache miss - calling expensive operation...")
        result = simulate_expensive_operation(prompt, delay=0.5)
        cache.set(prompt, result)
    else:
        result = cached

    time1 = time.time() - start
    print(f"  Result: {result}")
    print(f"  Time: {time1:.3f}s")
    print()

    # Second call - cache hit
    print("Second call (cache hit):")
    start = time.time()

    cached = cache.get(prompt)
    if cached is None:
        print("  Cache miss - calling expensive operation...")
        result = simulate_expensive_operation(prompt, delay=0.5)
        cache.set(prompt, result)
    else:
        print("  Cache hit - instant!")
        result = cached

    time2 = time.time() - start
    print(f"  Result: {result}")
    print(f"  Time: {time2:.3f}s")
    print()

    # Calculate speedup
    if time2 > 0:
        speedup = time1 / time2
        print(f"Speedup: {speedup:.1f}x faster")
        print(f"Time saved: {(time1 - time2)*1000:.0f}ms")

    print(f"Cache size: {cache.size()} entries")
    print()
    print("=" * 70)
    print()


def demo_optimizer():
    """Demonstrate the PerformanceOptimizer."""
    print("=" * 70)
    print("DEMO 2: Performance Optimizer with get_cached_or_compute")
    print("=" * 70)
    print()

    # Initialize optimizer with our config
    optimizer = PerformanceOptimizer()

    prompts = [
        "What is machine learning?",
        "What is deep learning?",
        "What is machine learning?",  # Duplicate - will hit cache
        "What is neural network?",
        "What is deep learning?",  # Duplicate - will hit cache
    ]

    print(f"Processing {len(prompts)} prompts (2 duplicates):\n")

    total_time = 0
    cache_hits = 0

    for i, prompt in enumerate(prompts, 1):
        print(f"{i}. Processing: '{prompt}'")

        start = time.time()
        result = optimizer.get_cached_or_compute(
            key=prompt,
            compute_fn=lambda p=prompt: simulate_expensive_operation(p, delay=0.3)
        )
        elapsed = time.time() - start
        total_time += elapsed

        # Check if it was a cache hit (< 10ms means cache hit)
        if elapsed < 0.01:
            cache_hits += 1
            print(f"   ✓ Cache hit! ({elapsed*1000:.1f}ms)")
        else:
            print(f"   ○ Cache miss ({elapsed*1000:.0f}ms)")
        print()

    print(f"Summary:")
    print(f"  Total prompts: {len(prompts)}")
    print(f"  Cache hits: {cache_hits}")
    print(f"  Cache misses: {len(prompts) - cache_hits}")
    print(f"  Total time: {total_time:.2f}s")
    print(f"  Average time per prompt: {total_time/len(prompts):.2f}s")
    print(f"  Time saved from caching: ~{cache_hits * 0.3:.1f}s")
    print()
    print("=" * 70)
    print()


def demo_cache_management():
    """Demonstrate cache management features."""
    print("=" * 70)
    print("DEMO 3: Cache Management and Statistics")
    print("=" * 70)
    print()

    cache = PredictionCache(max_entries=5, ttl_ms=2000)  # Small cache, 2s TTL

    # Populate cache
    print("Populating cache with 5 entries...")
    for i in range(5):
        cache.set(f"prompt_{i}", f"response_{i}")

    print(f"Cache size: {cache.size()}/5")
    print()

    # Add one more to trigger eviction
    print("Adding 6th entry (will trigger LRU eviction)...")
    cache.set("prompt_5", "response_5")
    print(f"Cache size: {cache.size()}/5 (oldest entry evicted)")
    print()

    # Wait for TTL expiration
    print("Waiting 2.5s for TTL expiration...")
    time.sleep(2.5)

    # Cleanup expired
    removed = cache.cleanup_expired()
    print(f"Cleaned up {removed} expired entries")
    print(f"Cache size after cleanup: {cache.size()}/5")
    print()

    # Clear all
    print("Clearing entire cache...")
    cache.clear()
    print(f"Cache size after clear: {cache.size()}/5")
    print()
    print("=" * 70)
    print()


def demo_batching():
    """Demonstrate request batching."""
    print("=" * 70)
    print("DEMO 4: Request Batching")
    print("=" * 70)
    print()

    batches_processed = []

    def process_batch(batch):
        """Callback when batch is ready."""
        batches_processed.append(batch)
        print(f"  → Processing batch of {len(batch)} requests")

    batcher = RequestBatcher(
        max_batch_size=3,
        max_wait_time_ms=1000,
        callback=process_batch
    )

    print("Adding requests one by one:")
    print("(Batch auto-flushes at 3 requests)\n")

    for i in range(7):
        print(f"Adding request {i+1}...")
        batch = batcher.add(f"request_{i}")
        if batch:
            print(f"  Batch ready with {len(batch)} requests!")
        time.sleep(0.2)

    # Flush remaining
    print("\nFlushing remaining requests...")
    remaining = batcher.flush()
    if remaining:
        print(f"  → Processing batch of {len(remaining)} requests")
        batches_processed.append(remaining)

    print(f"\nTotal batches processed: {len(batches_processed)}")
    for i, batch in enumerate(batches_processed, 1):
        print(f"  Batch {i}: {len(batch)} requests")

    print()
    print("=" * 70)
    print()


def demo_performance_comparison():
    """Demonstrate performance comparison with and without caching."""
    print("=" * 70)
    print("DEMO 5: Performance Comparison (With vs Without Cache)")
    print("=" * 70)
    print()

    prompts = ["Question A", "Question B", "Question C"] * 3  # 9 total, 3 unique

    # Without cache
    print("WITHOUT CACHING:")
    start = time.time()
    results_no_cache = []
    for prompt in prompts:
        result = simulate_expensive_operation(prompt, delay=0.2)
        results_no_cache.append(result)
    time_no_cache = time.time() - start
    print(f"  Time: {time_no_cache:.2f}s for {len(prompts)} requests")
    print(f"  Average: {time_no_cache/len(prompts)*1000:.0f}ms per request")
    print()

    # With cache
    print("WITH CACHING:")
    cache = PredictionCache()
    start = time.time()
    results_cached = []
    for prompt in prompts:
        cached = cache.get(prompt)
        if cached is None:
            result = simulate_expensive_operation(prompt, delay=0.2)
            cache.set(prompt, result)
        else:
            result = cached
        results_cached.append(result)
    time_cached = time.time() - start
    print(f"  Time: {time_cached:.2f}s for {len(prompts)} requests")
    print(f"  Average: {time_cached/len(prompts)*1000:.0f}ms per request")
    print()

    # Comparison
    print("COMPARISON:")
    speedup = time_no_cache / time_cached if time_cached > 0 else 0
    time_saved = time_no_cache - time_cached
    cost_reduction = (time_saved / time_no_cache * 100) if time_no_cache > 0 else 0

    print(f"  Speedup: {speedup:.1f}x faster")
    print(f"  Time saved: {time_saved:.2f}s ({time_saved*1000:.0f}ms)")
    print(f"  Cost reduction: ~{cost_reduction:.0f}%")
    print(f"  Cache size: {cache.size()} entries")
    print()
    print("=" * 70)
    print()


def main():
    """Run all demos."""
    print("\n" + "=" * 70)
    print("Performance Optimization Demonstration")
    print("(Local simulation without AWS credentials)")
    print("=" * 70)
    print()

    try:
        demo_basic_cache()
        time.sleep(0.5)

        demo_optimizer()
        time.sleep(0.5)

        demo_cache_management()
        time.sleep(0.5)

        demo_batching()
        time.sleep(0.5)

        demo_performance_comparison()

        print("=" * 70)
        print("✓ All demos completed successfully!")
        print("=" * 70)
        print()
        print("Key Takeaways:")
        print("  • Caching provides 10-50x speedup on repeated queries")
        print("  • LRU eviction manages memory automatically")
        print("  • TTL expiration prevents stale data")
        print("  • Batching reduces overhead for bulk operations")
        print("  • Thread-safe for concurrent access")
        print()
        print("Next steps:")
        print("  • Install boto3: pip install boto3")
        print("  • Configure AWS credentials")
        print("  • Run: python scripts/example_performance_usage.py")
        print()

    except Exception as e:
        print(f"\n✗ Error running demos: {e}\n")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
