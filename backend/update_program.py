"""Replace the program collection with the 12-session schedule for 21 May 2026."""
import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

NEW_SCHEDULE = [
    ("12:00", "12:10", "Açılış ve Hoşgeldiniz",                                          "Ayça Kuru",           "talk"),
    ("12:10", "12:20", "Yatırım Simülatörü Etkinliği",                                   "Muhammet Özdemir",    "talk"),
    ("12:20", "12:45", "Konut Bitti, Sıra Toprakta: 2026 Fırsat Haritası",               "Murat Gültekin",      "talk"),
    ("12:45", "13:05", "Yenişehir Sunumu",                                               "Muhammet Özdemir",    "talk"),
    ("13:05", "13:30", "Arsa Yatırımında: Bütçe? Zaman? Beklenti?",                      "Oğuzhan Öztürk",      "talk"),
    ("13:30", "13:50", "Kahve Arası",                                                    "",                    "break"),
    ("13:50", "14:15", "Arazi Yatırım Semineri",                                         "Muhammet Özdemir",    "talk"),
    ("14:15", "14:40", "Arazide Hukuk",                                                  "Büşra Kiraz",         "talk"),
    ("14:40", "15:00", "e-İPat Platform Tanıtımı",                                       "Muhammet Özdemir",    "talk"),
    ("15:00", "15:20", "Soru – Cevap + 10 Milyon TL Değerlendirmeleri",                  "Tüm Katılımcılar",    "panel"),
    ("15:20", "15:40", "Plaket Takdimi ve Kapanış",                                      "Muhammet Özdemir",    "talk"),
    ("15:40", "19:00", "8. Gayrimenkul Proje Yatırım Fuarı – Stand Ziyaretleri",         "",                    "break"),
]


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc)

    deleted = await db.program.delete_many({})
    print(f"Deleted {deleted.deleted_count} old program rows")

    docs = []
    for i, (ts, te, title, sp, stype) in enumerate(NEW_SCHEDULE):
        docs.append({
            "time_start": ts,
            "time_end": te,
            "title": title,
            "speaker_name": sp,
            "session_type": stype,
            "description": "",
            "order": i,
            "created_at": now,
        })
    res = await db.program.insert_many(docs)
    print(f"Inserted {len(res.inserted_ids)} new sessions")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
