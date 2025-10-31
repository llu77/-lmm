# Lambda Functions

This directory contains AWS Lambda function handlers for various processing tasks.

## Contextual Retrieval Handlers

### Standard Handler (`contextual_retrieval_handler.py`)

The standard handler implements contextual retrieval for document chunks.

### Optimized Handler (`optimized_contextual_retrieval_handler.py`)

The optimized handler adds performance enhancements:

- **Caching**: Identical chunks get cached contexts (90% cost reduction)
- **Automatic cleanup**: Expired cache entries are removed
- **Cache statistics**: Detailed logging of cache performance
- **Same API**: Drop-in replacement for standard handler

**When to use optimized handler:**
- Processing documents with repeated content
- Multiple Lambda invocations on similar documents
- Cost-sensitive workflows
- High-volume processing

**Performance comparison:**

| Metric | Standard | Optimized (cache hit) |
|--------|----------|----------------------|
| Latency | ~2-5s | ~50-200ms |
| Cost per chunk | 100% | ~10% |
| API calls | Every chunk | Only cache misses |

The `contextual_retrieval_handler.py` implements a Lambda function for adding contextual information to document chunks to improve search retrieval accuracy.

### How It Works

1. **Reads chunked documents** from S3
2. **Generates context** for each chunk using Claude via Bedrock
3. **Prepends context** to each chunk
4. **Writes enhanced chunks** back to S3

This implements the "Contextual Retrieval" technique that improves RAG (Retrieval-Augmented Generation) accuracy by providing additional context about each chunk's position within the larger document.

### Deployment

#### Prerequisites

- AWS Lambda with Python 3.11+ runtime
- IAM role with permissions for:
  - S3 read/write (`s3:GetObject`, `s3:PutObject`)
  - Bedrock model invocation (`bedrock:InvokeModelWithResponseStream`)

#### Steps

1. **Package the Lambda function:**

```bash
cd scripts/
pip install boto3 -t package/
cp -r claude_bedrock package/
cp lambda/contextual_retrieval_handler.py package/lambda_function.py
cd package && zip -r ../lambda_function.zip . && cd ..
```

2. **Create the Lambda function:**

```bash
aws lambda create-function \
  --function-name contextual-retrieval \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR_ACCOUNT:role/YOUR_LAMBDA_ROLE \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://lambda_function.zip \
  --timeout 300 \
  --memory-size 512
```

3. **Update environment variables (if needed):**

```bash
aws lambda update-function-configuration \
  --function-name contextual-retrieval \
  --environment Variables={AWS_REGION=us-east-1}
```

### Event Format

**Input:**
```json
{
  "inputFiles": [
    {
      "originalFileLocation": {
        "uri": "s3://my-bucket/docs/original.pdf"
      },
      "contentBatches": [
        {
          "key": "chunked/original_chunks.json"
        }
      ]
    }
  ],
  "bucketName": "my-bucket"
}
```

**Output:**
```json
{
  "outputFiles": [
    {
      "originalFileLocation": {
        "uri": "s3://my-bucket/docs/original.pdf"
      },
      "fileMetadata": {},
      "contentBatches": [
        {
          "key": "Output/chunked/original_chunks.json"
        }
      ]
    }
  ]
}
```

### Chunk File Format

Each chunk file should be a JSON with this structure:

```json
{
  "fileContents": [
    {
      "contentBody": "The actual text content of the chunk",
      "contentType": "text/plain",
      "contentMetadata": {
        "chunkIndex": 0,
        "totalChunks": 10
      }
    }
  ]
}
```

### IAM Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### Monitoring

The Lambda function logs detailed information to CloudWatch Logs:
- Input event details
- Number of chunks processed
- Generated context snippets
- Output file locations

### Cost Optimization

- Uses Claude Haiku by default (most cost-effective)
- Processes chunks in sequence (predictable costs)
- Configurable `max_tokens` to control generation length
- Can be modified to use parallel processing for faster throughput

### Integration with AWS Services

This Lambda can be integrated with:
- **Amazon Bedrock Knowledge Bases** - For enhanced RAG
- **AWS Step Functions** - For orchestrating document processing pipelines
- **Amazon EventBridge** - For event-driven processing
- **Amazon S3** - For triggering on new document uploads
