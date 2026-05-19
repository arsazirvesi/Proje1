"""
Pillow-based image optimization for admin uploads.

Conservative settings:
- Max width 1920px (anything wider is downscaled proportionally)
- Quality 85 (visually lossless for web)
- WebP for opaque images (best ratio)
- PNG kept for images with alpha channel (logos, transparent banners)
- GIFs and very small images (<800px wide AND <500KB) pass through unchanged
"""
import io
import logging
from typing import Tuple

from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

MAX_WIDTH = 1920
QUALITY = 85
SMALL_BYPASS_BYTES = 500 * 1024
SMALL_BYPASS_WIDTH = 800


def optimize_image(
    content: bytes,
    original_content_type: str,
    *,
    prefer_webp: bool = True,
) -> Tuple[bytes, str, str]:
    """Return (optimized_bytes, content_type, file_extension).

    On any failure or unsupported input, returns the original bytes/type unchanged
    so the caller can still complete the upload.
    """
    # GIFs (animated) pass through — Pillow re-encode loses animation
    if original_content_type == "image/gif":
        return content, "image/gif", ".gif"

    # Small files probably already optimized
    if len(content) < SMALL_BYPASS_BYTES:
        try:
            with Image.open(io.BytesIO(content)) as probe:
                if probe.width <= SMALL_BYPASS_WIDTH:
                    return content, original_content_type, _ext_for(original_content_type)
        except Exception:
            pass  # Fall through to full pipeline

    try:
        with Image.open(io.BytesIO(content)) as img:
            # Honor EXIF orientation (phone photos)
            img = ImageOps.exif_transpose(img)

            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

            # Resize if too wide
            if img.width > MAX_WIDTH:
                new_h = int(img.height * (MAX_WIDTH / img.width))
                img = img.resize((MAX_WIDTH, new_h), Image.Resampling.LANCZOS)

            buf = io.BytesIO()
            if has_alpha:
                # Keep PNG to preserve transparency (logos, badges)
                if img.mode != "RGBA":
                    img = img.convert("RGBA")
                img.save(buf, format="PNG", optimize=True)
                return buf.getvalue(), "image/png", ".png"

            # Opaque → WebP (or JPEG if caller insists)
            if img.mode != "RGB":
                img = img.convert("RGB")

            if prefer_webp:
                img.save(buf, format="WEBP", quality=QUALITY, method=6)
                return buf.getvalue(), "image/webp", ".webp"

            img.save(buf, format="JPEG", quality=QUALITY, optimize=True, progressive=True)
            return buf.getvalue(), "image/jpeg", ".jpg"
    except Exception as e:
        logger.warning("Image optimization failed (%s) — passing through original", e)
        return content, original_content_type, _ext_for(original_content_type)


def _ext_for(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(content_type, ".bin")
