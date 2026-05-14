"""
Reserve 100 summit slots under MRXOZDEMIR invite code as "No Name" placeholders.
Names/phones/emails can be filled in later via admin panel.
Each record is is_verified=True so it counts toward 600 cap.
Idempotent: re-running won't create duplicates (uses unique email pattern).
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

INVITE_CODE = "MRXOZDEMIR"
INVITE_LABEL = "Muhammet Özdemir davetlisi"
TOTAL = 100
EMAIL_DOMAIN = "reserved-mrxozdemir.local"  # unreal domain → won't bounce, easy filter


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    now = datetime.now(timezone.utc).isoformat()

    created = 0
    skipped = 0
    for i in range(1, TOTAL + 1):
        seq = f"{i:03d}"
        email = f"reserved-mrxozdemir-{seq}@{EMAIL_DOMAIN}"
        existing = await db.guests.find_one({"email": email})
        if existing:
            skipped += 1
            continue

        doc = {
            "name": f"No Name #{seq}",
            "email": email,
            "phone": f"0000000{seq}",
            "visit_type": "summit",
            "invite_code": INVITE_CODE,
            "city": "",
            "company": "",
            "title": "",
            "participant_type": "bireysel",
            "interest": "",
            "expectations": "",
            "is_verified": True,
            "verified_at": now,
            "verification_token": None,
            "verification_sent_at": None,
            "badge_printed": False,
            "status": "reserved",  # special status so admin can filter
            "admin_notes": f"Rezerve ({INVITE_LABEL}) — isim sonradan girilecek",
            "is_reserved": True,
            "created_at": now,
            "updated_at": now,
        }
        await db.guests.insert_one(doc)
        created += 1

    # Bump invite code usage counter
    inc = created
    if inc > 0:
        await db.invite_codes.update_one(
            {"code": INVITE_CODE},
            {"$inc": {"used_count": inc}, "$set": {"last_used_at": now}},
        )

    summit_verified = await db.guests.count_documents({
        "visit_type": {"$in": ["summit", None]},
        "is_verified": True,
    })
    reserved = await db.guests.count_documents({"is_reserved": True, "invite_code": INVITE_CODE})
    print(f"Created: {created}")
    print(f"Skipped (already existed): {skipped}")
    print(f"Total verified summit guests now: {summit_verified}")
    print(f"Total reserved under {INVITE_CODE}: {reserved}")


asyncio.run(main())
