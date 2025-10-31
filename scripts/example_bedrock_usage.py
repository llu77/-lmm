#!/usr/bin/env python3
"""
Example: Using Claude via AWS Bedrock
======================================

This script demonstrates how to use the InferenceAdapter to invoke Claude models
via AWS Bedrock with both streaming and non-streaming responses.

Prerequisites:
    - AWS credentials configured
    - boto3 installed (pip install boto3)
    - Bedrock model access enabled in your AWS account
"""

from claude_bedrock import InferenceAdapter


def example_streaming():
    """Example of streaming response from Claude."""
    print("=" * 60)
    print("EXAMPLE 1: Streaming Response")
    print("=" * 60)

    adapter = InferenceAdapter()
    prompt = "Write a haiku about coding."

    print(f"\nPrompt: {prompt}\n")
    print("Response (streaming):")
    print("-" * 60)

    for chunk in adapter.invoke_model_with_response_stream(prompt, max_tokens=200):
        if chunk:
            print(chunk, end='', flush=True)

    print("\n" + "=" * 60 + "\n")


def example_complete_response():
    """Example of getting complete response from Claude."""
    print("=" * 60)
    print("EXAMPLE 2: Complete Response")
    print("=" * 60)

    adapter = InferenceAdapter()
    prompt = "What are the three laws of robotics?"

    print(f"\nPrompt: {prompt}\n")
    print("Response:")
    print("-" * 60)

    response = adapter.invoke_model(prompt, max_tokens=500)
    if response:
        print(response)
    else:
        print("Error: Failed to get response")

    print("\n" + "=" * 60 + "\n")


def example_custom_config():
    """Example with custom configuration."""
    print("=" * 60)
    print("EXAMPLE 3: Custom Configuration")
    print("=" * 60)

    # Use different region and model
    adapter = InferenceAdapter(
        region_name='us-east-1',
        model_id='anthropic.claude-haiku-4-5-20251001-v1:0'
    )

    prompt = "Explain recursion in one sentence."

    print(f"\nPrompt: {prompt}\n")
    print("Response (temperature=0.7):")
    print("-" * 60)

    response = adapter.invoke_model(
        prompt=prompt,
        max_tokens=100,
        temperature=0.7
    )

    if response:
        print(response)
    else:
        print("Error: Failed to get response")

    print("\n" + "=" * 60 + "\n")


def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("Claude Bedrock Integration Examples")
    print("=" * 60 + "\n")

    try:
        example_streaming()
        example_complete_response()
        example_custom_config()

        print("✓ All examples completed successfully!\n")

    except Exception as e:
        print(f"\n✗ Error running examples: {e}\n")
        print("Make sure:")
        print("  1. AWS credentials are configured")
        print("  2. You have Bedrock model access enabled")
        print("  3. boto3 is installed (pip install boto3)")


if __name__ == "__main__":
    main()
