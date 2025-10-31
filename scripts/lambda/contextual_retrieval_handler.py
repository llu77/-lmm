"""
AWS Lambda Handler for Contextual Retrieval
============================================

This Lambda function processes document chunks and adds contextual information
to improve search retrieval accuracy. It uses Claude via AWS Bedrock to generate
context for each chunk based on the overall document.

This implements the "Contextual Retrieval" technique described in:
https://www.anthropic.com/news/contextual-retrieval

Usage:
    Deploy this as an AWS Lambda function with:
    - Runtime: Python 3.11 or later
    - IAM permissions for S3 read/write and Bedrock model invocation
    - Environment variables as needed
"""

import json
import os
import logging
import traceback
import sys

# Add parent directory to path to import from scripts
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from claude_bedrock.inference_adapter import InferenceAdapter
from claude_bedrock.s3_adapter import S3Adapter

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# Prompt template for generating contextual information
CONTEXTUAL_RETRIEVAL_PROMPT = """
<document>
{doc_content}
</document>

Here is the chunk we want to situate within the whole document
<chunk>
{chunk_content}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk.
Answer only with the succinct context and nothing else.
"""


def lambda_handler(event, context):
    """
    AWS Lambda handler for contextual retrieval processing.

    Expected event structure:
    {
        "inputFiles": [
            {
                "originalFileLocation": {"uri": "s3://..."},
                "contentBatches": [
                    {"key": "path/to/chunked/file.json"}
                ]
            }
        ],
        "bucketName": "my-bucket"
    }

    Returns:
    {
        "outputFiles": [
            {
                "originalFileLocation": {...},
                "fileMetadata": {},
                "contentBatches": [{"key": "Output/path/to/file.json"}]
            }
        ]
    }
    """
    logger.debug('input={}'.format(json.dumps(event)))

    s3_adapter = S3Adapter()
    inference_adapter = InferenceAdapter()

    # Extract relevant information from the input event
    input_files = event.get('inputFiles')
    input_bucket = event.get('bucketName')

    if not all([input_files, input_bucket]):
        raise ValueError("Missing required input parameters")

    output_files = []
    for input_file in input_files:

        processed_batches = []
        for batch in input_file.get('contentBatches'):

            # Get chunks from S3
            input_key = batch.get('key')

            if not input_key:
                raise ValueError("Missing key in content batch")

            # Read file from S3
            file_content = s3_adapter.read_from_s3(
                bucket_name=input_bucket,
                file_name=input_key
            )
            logger.debug(f"Read file from S3: {input_key}")

            # Combine all chunks together to build content of original file
            # Alternatively we can also read original file and extract text from it
            original_document_content = ''.join(
                content.get('contentBody')
                for content in file_content.get('fileContents')
                if content
            )

            # Process one chunk at a time
            chunked_content = {
                'fileContents': []
            }

            for idx, content in enumerate(file_content.get('fileContents')):
                content_body = content.get('contentBody', '')
                content_type = content.get('contentType', '')
                content_metadata = content.get('contentMetadata', {})

                logger.debug(f"Processing chunk {idx + 1}/{len(file_content.get('fileContents'))}")

                # Update chunk with additional context
                prompt = CONTEXTUAL_RETRIEVAL_PROMPT.format(
                    doc_content=original_document_content,
                    chunk_content=content_body
                )

                response_stream = inference_adapter.invoke_model_with_response_stream(
                    prompt,
                    max_tokens=500
                )
                chunk_context = ''.join(chunk for chunk in response_stream if chunk)

                logger.debug(f"Generated context for chunk {idx + 1}: {chunk_context[:100]}...")

                # Append chunk with context to output file content
                chunked_content['fileContents'].append({
                    "contentBody": chunk_context + "\n\n" + content_body,
                    "contentType": content_type,
                    "contentMetadata": content_metadata,
                })

            output_key = f"Output/{input_key}"

            # Write updated chunks to output S3
            s3_adapter.write_output_to_s3(input_bucket, output_key, chunked_content)
            logger.info(f"Wrote processed chunks to S3: {output_key}")

            # Append the processed chunks file to list of files
            processed_batches.append({"key": output_key})

        output_files.append({
            "originalFileLocation": input_file.get('originalFileLocation'),
            "fileMetadata": {},
            "contentBatches": processed_batches
        })

    return {
        "outputFiles": output_files
    }
