"""
Claude Bedrock Integration
===========================

Utilities for invoking Claude models via AWS Bedrock and working with S3.
"""

from .inference_adapter import InferenceAdapter
from .s3_adapter import S3Adapter
from .optimized_adapter import OptimizedInferenceAdapter

__all__ = ['InferenceAdapter', 'S3Adapter', 'OptimizedInferenceAdapter']
__version__ = '1.0.0'
