"""Scan ALL collections and ALL string fields for any /api/uploads/ reference."""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()


def scan(value, path=""):
    """Recursively yield (path, value) where value is a string containing /api/uploads/."""
    if isinstance(value, str) and ("/api/uploads/" in value or "/uploads/" in value or "fair_" in value or ".jpeg" in value or ".png" in value):
        yield path, value
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from scan(v, f"{path}.{k}" if path else k)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from scan(v, f"{path}[{i}]")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    for c in await db.list_collection_names():
        async for doc in db[c].find({}):
            doc_id = doc.get("_id")
            for p, v in scan(doc):
                if p == "_id":
                    continue
                print(f"{c}/{doc_id} -> {p} = {v}")
    client.close()


asyncio.run(main())
