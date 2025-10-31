"""
S3 Adapter for Reading and Writing Files
=========================================

This module provides utilities for reading and writing files to AWS S3,
particularly for use with document processing and chunking workflows.
"""

import json
import boto3
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError


class S3Adapter:
    """
    Adapter for reading and writing files to AWS S3.

    This class provides simple methods for S3 operations commonly used
    in document processing workflows.
    """

    def __init__(self, region_name: str = 'us-east-1'):
        """
        Initialize the S3Adapter.

        Args:
            region_name: AWS region name (default: 'us-east-1')
        """
        self.s3_client = boto3.client('s3', region_name=region_name)

    def read_from_s3(self, bucket_name: str, file_name: str) -> Dict[str, Any]:
        """
        Read a JSON file from S3.

        Args:
            bucket_name: Name of the S3 bucket
            file_name: S3 key (path) of the file to read

        Returns:
            Dict containing the parsed JSON content

        Raises:
            ClientError: If S3 read operation fails
        """
        try:
            response = self.s3_client.get_object(Bucket=bucket_name, Key=file_name)
            content = response['Body'].read().decode('utf-8')
            return json.loads(content)
        except ClientError as e:
            print(f"Error reading from S3: {e}")
            raise

    def write_output_to_s3(
        self,
        bucket_name: str,
        file_name: str,
        content: Dict[str, Any]
    ) -> None:
        """
        Write JSON content to S3.

        Args:
            bucket_name: Name of the S3 bucket
            file_name: S3 key (path) where the file will be written
            content: Dictionary to be serialized as JSON and written to S3

        Raises:
            ClientError: If S3 write operation fails
        """
        try:
            json_content = json.dumps(content, ensure_ascii=False, indent=2)
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=file_name,
                Body=json_content.encode('utf-8'),
                ContentType='application/json'
            )
        except ClientError as e:
            print(f"Error writing to S3: {e}")
            raise

    def read_bytes_from_s3(self, bucket_name: str, file_name: str) -> bytes:
        """
        Read raw bytes from S3 (for non-JSON files).

        Args:
            bucket_name: Name of the S3 bucket
            file_name: S3 key (path) of the file to read

        Returns:
            bytes: Raw file content

        Raises:
            ClientError: If S3 read operation fails
        """
        try:
            response = self.s3_client.get_object(Bucket=bucket_name, Key=file_name)
            return response['Body'].read()
        except ClientError as e:
            print(f"Error reading bytes from S3: {e}")
            raise

    def write_bytes_to_s3(
        self,
        bucket_name: str,
        file_name: str,
        content: bytes,
        content_type: Optional[str] = None
    ) -> None:
        """
        Write raw bytes to S3.

        Args:
            bucket_name: Name of the S3 bucket
            file_name: S3 key (path) where the file will be written
            content: Raw bytes to write
            content_type: MIME type of the content (optional)

        Raises:
            ClientError: If S3 write operation fails
        """
        try:
            kwargs = {
                'Bucket': bucket_name,
                'Key': file_name,
                'Body': content
            }
            if content_type:
                kwargs['ContentType'] = content_type

            self.s3_client.put_object(**kwargs)
        except ClientError as e:
            print(f"Error writing bytes to S3: {e}")
            raise

    def list_objects(
        self,
        bucket_name: str,
        prefix: str = '',
        max_keys: int = 1000
    ) -> list:
        """
        List objects in an S3 bucket with optional prefix filter.

        Args:
            bucket_name: Name of the S3 bucket
            prefix: Prefix to filter objects (default: '')
            max_keys: Maximum number of keys to return (default: 1000)

        Returns:
            list: List of object keys

        Raises:
            ClientError: If S3 list operation fails
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            if 'Contents' in response:
                return [obj['Key'] for obj in response['Contents']]
            return []
        except ClientError as e:
            print(f"Error listing objects in S3: {e}")
            raise

    def delete_object(self, bucket_name: str, file_name: str) -> None:
        """
        Delete an object from S3.

        Args:
            bucket_name: Name of the S3 bucket
            file_name: S3 key (path) of the file to delete

        Raises:
            ClientError: If S3 delete operation fails
        """
        try:
            self.s3_client.delete_object(Bucket=bucket_name, Key=file_name)
        except ClientError as e:
            print(f"Error deleting object from S3: {e}")
            raise
