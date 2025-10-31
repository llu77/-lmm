#!/usr/bin/env python3
"""
Example: Performance Optimization with Caching and Batching
============================================================

This script demonstrates how to use the performance optimization features
with the Bedrock Claude adapter.

Prerequisites:
    - AWS credentials configured
    - boto3 installed
    - Performance config at config/performance.json
"""

import time
from claude_bedrock import OptimizedInferenceAdapter


def example_caching():
    """Demonstrate prediction caching benefits."""
    print("=" * 60)
    print("EXAMPLE 1: Prediction Caching")
    print("=" * 60)

    adapter = OptimizedInferenceAdapter(enable_cache=True)

    prompt = "What are the three laws of robotics?"

    # First call - cache miss
    print("\nFirst call (cache miss):")
    start = time.time()
    response1 = adapter.invoke_model_cached(prompt, max_tokens=200)
    time1 = time.time() - start
    print(f"Response: {response1[:100]}...")
    print(f"Time: {time1:.2f}s")

    # Second call - cache hit
    print("\nSecond call (cache hit):")
    start = time.time()
    response2 = adapter.invoke_model_cached(prompt, max_tokens=200)
    time2 = time.time() - start
    print(f"Response: {response2[:100]}...")
    print(f"Time: {time2:.2f}s")

    # Calculate speedup
    speedup = time1 / time2 if time2 > 0 else float('inf')
    print(f"\nSpeedup: {speedup:.1f}x faster")
    print(f"Cost reduction: ~{(1 - time2/time1) * 100:.0f}%")

    # Check cache stats
    stats = adapter.get_cache_stats()
    print(f"\nCache stats: {stats}")

    print("\n" + "=" * 60 + "\n")


def example_batch_processing():
    """Demonstrate batch processing."""
    print("=" * 60)
    print("EXAMPLE 2: Batch Processing")
    print("=" * 60)

    adapter = OptimizedInferenceAdapter(enable_cache=True)

    questions = [
        "What is AI?",
        "What is machine learning?",
        "What is deep learning?",
        "What is AI?",  # Duplicate - will use cache
        "What is neural network?"
    ]

    requests = [
        {"prompt": q, "max_tokens": 100}
        for q in questions
    ]

    print(f"\nProcessing {len(requests)} questions...")
    print("(Note: 4th question is duplicate and will use cache)")

    start = time.time()
    results = adapter.invoke_batch(requests, use_cache=True)
    total_time = time.time() - start

    print(f"\nCompleted in {total_time:.2f}s")
    print(f"Average time per question: {total_time/len(requests):.2f}s")

    print("\nResults:")
    for i, (question, result) in enumerate(zip(questions, results), 1):
        print(f"\n{i}. {question}")
        print(f"   {result[:80] if result else 'Error'}...")

    # Show cache stats
    stats = adapter.get_cache_stats()
    print(f"\nCache stats: {stats}")

    print("\n" + "=" * 60 + "\n")


def example_cache_management():
    """Demonstrate cache management."""
    print("=" * 60)
    print("EXAMPLE 3: Cache Management")
    print("=" * 60)

    adapter = OptimizedInferenceAdapter(enable_cache=True)

    # Populate cache
    print("\nPopulating cache with 3 prompts...")
    prompts = [
        "What is Python?",
        "What is JavaScript?",
        "What is Rust?"
    ]

    for prompt in prompts:
        adapter.invoke_model_cached(prompt, max_tokens=50)

    stats = adapter.get_cache_stats()
    print(f"Cache size: {stats['size']}/{stats['max_entries']}")

    # Force refresh
    print("\nForce refreshing first prompt...")
    adapter.invoke_model_cached(
        "What is Python?",
        max_tokens=50,
        force_refresh=True
    )

    # Clean up expired entries
    print("\nCleaning up expired entries...")
    removed = adapter.cleanup_expired_cache()
    print(f"Removed {removed} expired entries")

    # Clear entire cache
    print("\nClearing entire cache...")
    adapter.clear_cache()

    stats = adapter.get_cache_stats()
    print(f"Cache size after clear: {stats['size']}/{stats['max_entries']}")

    print("\n" + "=" * 60 + "\n")


def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("Performance Optimization Examples")
    print("=" * 60 + "\n")

    try:
        example_caching()
        example_batch_processing()
        example_cache_management()

        print("✓ All examples completed successfully!\n")

    except Exception as e:
        print(f"\n✗ Error running examples: {e}\n")
        print("Make sure:")
        print("  1. AWS credentials are configured")
        print("  2. You have Bedrock model access enabled")
        print("  3. boto3 is installed")
        print("  4. config/performance.json exists")


if __name__ == "__main__":
    main()
