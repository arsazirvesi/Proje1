"""
One-time migration: copy local /app/backend/uploads/*.* into Cloudflare R2,
then rewrite MongoDB records that reference /api/uploads/... so they point
to the new public R2 URL (media.arsayatirimzirvesi.com/uploads/...).

Run:
    cd /app/backend && python migrate_uploads_to_r2.py
"""
import asyncio
import logging
import mimetypes
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent))
import r2_storage  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("migrate")

UPLOADS_DIR = Path(__file__).parent / "uploads"
LEGACY_PREFIX = "/api/uploads/"

# All known URL fields that might point to /api/uploads/* across collections
URL_FIELDS = [
    "image_url",
    "mobile_image_url",
    "logo_url",
    "floor_plan_url",
    "bg_image_url",
    "background_image_url",
    "photo_url",
    "url",
]


async def find_legacy_docs(db):
    """Return list of (collection, doc_id, field, old_url) tuples to rewrite."""
    hits = []
    for coll_name in await db.list_collection_names():
        coll = db[coll_name]
        for field in URL_FIELDS:
            cursor = coll.find({field: {"$regex": LEGACY_PREFIX}}, {field: 1})
            async for doc in cursor:
                hits.append((coll_name, doc["_id"], field, doc[field]))
    return hits


async def main():
    if not r2_storage.is_configured():
        log.error("R2 not configured — check .env")
        sys.exit(1)

    # 1) Upload every file in /app/backend/uploads/ to R2 (if not already there)
    files = sorted([p for p in UPLOADS_DIR.iterdir() if p.is_file()])
    log.info("Found %d files in local uploads dir", len(files))

    name_to_url = {}
    for path in files:
        key = f"uploads/{path.name}"
        ctype, _ = mimetypes.guess_type(str(path))
        ctype = ctype or "application/octet-stream"
        data = path.read_bytes()
        try:
            url = await asyncio.to_thread(r2_storage.upload_bytes, key, data, ctype)
            name_to_url[path.name] = url
            log.info("  ✓ %s → %s", path.name, url)
        except Exception as e:
            log.error("  ✗ %s upload failed: %s", path.name, e)

    log.info("Uploaded %d/%d files to R2", len(name_to_url), len(files))

    # 2) Connect to Mongo and rewrite documents that reference legacy URLs
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    hits = await find_legacy_docs(db)
    log.info("Found %d documents with legacy /api/uploads/ URLs", len(hits))

    rewritten = 0
    skipped = 0
    for coll_name, doc_id, field, old_url in hits:
        # /api/uploads/<filename>  →  <filename>
        filename = old_url.split("/api/uploads/", 1)[-1].split("?")[0].split("#")[0]
        if filename not in name_to_url:
            log.warning("  ✗ %s/%s.%s references missing file '%s' — skipping",
                        coll_name, doc_id, field, filename)
            skipped += 1
            continue
        new_url = name_to_url[filename]
        await db[coll_name].update_one({"_id": doc_id}, {"$set": {field: new_url}})
        log.info("  ✓ %s/%s.%s rewritten", coll_name, doc_id, field)
        rewritten += 1

    log.info("=" * 60)
    log.info("DONE — files uploaded: %d, docs rewritten: %d, docs skipped: %d",
             len(name_to_url), rewritten, skipped)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
