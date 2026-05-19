"""
Cloudflare R2 storage helper (S3-compatible).
Wraps boto3 client; exposes a single `upload_image_to_r2` helper that the
admin upload endpoint uses to persist user-uploaded images to R2 and
return a public URL on the custom domain (media.arsayatirimzirvesi.com).
"""
import os
import logging
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_ENDPOINT_URL = os.environ.get("R2_ENDPOINT_URL")
R2_PUBLIC_BASE_URL = os.environ.get("R2_PUBLIC_BASE_URL", "").rstrip("/")

_client = None


def is_configured() -> bool:
    return all([
        R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY, R2_ENDPOINT_URL, R2_PUBLIC_BASE_URL,
    ])


def get_client():
    global _client
    if _client is not None:
        return _client
    if not is_configured():
        raise RuntimeError("Cloudflare R2 credentials not fully configured in .env")
    _client = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=10,
            read_timeout=30,
        ),
    )
    return _client


def upload_bytes(
    key: str,
    data: bytes,
    content_type: str,
    cache_control: str = "public, max-age=31536000, immutable",
) -> str:
    """Upload a byte blob to R2 and return its public URL."""
    client = get_client()
    try:
        client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=content_type,
            CacheControl=cache_control,
        )
    except ClientError as e:
        logger.exception("R2 put_object failed for key=%s", key)
        raise RuntimeError(f"R2 upload failed: {e.response.get('Error', {}).get('Code', 'Unknown')}") from e
    return f"{R2_PUBLIC_BASE_URL}/{key}"


def delete_object(key: str) -> bool:
    """Delete an object by key. Returns True on success, False on error/missing."""
    try:
        get_client().delete_object(Bucket=R2_BUCKET_NAME, Key=key)
        return True
    except ClientError:
        logger.exception("R2 delete failed for key=%s", key)
        return False


def public_url_for(key: str) -> str:
    return f"{R2_PUBLIC_BASE_URL}/{key}"


def extract_key_from_public_url(url: Optional[str]) -> Optional[str]:
    """Given a previously returned R2 URL, return the storage key."""
    if not url or not R2_PUBLIC_BASE_URL:
        return None
    prefix = R2_PUBLIC_BASE_URL + "/"
    if url.startswith(prefix):
        return url[len(prefix):]
    return None
