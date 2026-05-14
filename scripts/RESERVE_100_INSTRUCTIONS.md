"""
PRODUCTION'A 100 KİŞİLİK MRXOZDEMIR REZERVASYONU NASIL UYGULANIR?

ÖNEMLİ: Ben (preview ortamı) sadece preview DB'sine yazabilirim.
Production DB'ye yansıması için aşağıdaki adımları izleyin:

═══════════════════════════════════════════════════════════
ADIM 1: Önce kodu deploy edin
───────────────────────────────────────────────────────────
- Backend'e yeni PUT /api/admin/guests/{id} endpoint'i eklendi
- Admin paneldeki ziyaretçi detay drawer'ı artık DÜZENLENEBİLİR
- "Rezerve" status'u STATUS_OPTIONS'a eklendi
→ Sağ üstteki **Deploy** butonuna basın
→ ~3-5 dk içinde production'da yansır

═══════════════════════════════════════════════════════════
ADIM 2: Production'a 100 placeholder oluşturun
───────────────────────────────────────────────────────────
Emergent Support'a aşağıdaki mesajı atın:

  "Production database'de aşağıdaki seed işlemini çalıştırır mısınız?
  Aşağıdaki scripti /app/backend altında çalıştırın:"

[script aşağıdaki dosyada: /tmp/reserve_mrxozdemir_100.py]

Alternatif olarak: Emergent admin panelden mongo shell açıp aşağıdaki
mongo komutu ile manuel ekleyebilirsiniz:

```javascript
// Mongo Shell — production DB
const now = new Date().toISOString();
const docs = [];
for (let i = 1; i <= 100; i++) {
  const seq = String(i).padStart(3, '0');
  docs.push({
    name: `No Name #${seq}`,
    email: `reserved-mrxozdemir-${seq}@reserved-mrxozdemir.local`,
    phone: `0000000${seq}`,
    visit_type: "summit",
    invite_code: "MRXOZDEMIR",
    city: "", company: "", title: "",
    participant_type: "bireysel",
    interest: "", expectations: "",
    is_verified: true,
    verified_at: now,
    verification_token: null,
    verification_sent_at: null,
    badge_printed: false,
    status: "reserved",
    admin_notes: "Rezerve (Muhammet Özdemir davetlisi) — isim sonradan girilecek",
    is_reserved: true,
    created_at: now,
    updated_at: now,
  });
}
db.guests.insertMany(docs);
db.invite_codes.updateOne({code: "MRXOZDEMIR"}, {$inc: {used_count: 100}, $set: {last_used_at: now}});
print("Done — 100 placeholders created");
```

═══════════════════════════════════════════════════════════
ADIM 3: İsimleri girme (production'da)
───────────────────────────────────────────────────────────
1. Admin panel → "Zirve Ziyaretçileri"
2. Filtre dropdown'undan "Rezerve" seçin
3. Listelenen 100 "No Name #XXX" kaydından birine tıklayın
4. Açılan drawer'da Ad Soyad, Telefon, Şirket girin
5. "Değişiklikleri Kaydet" → status otomatik "Yeni"ye geçer

═══════════════════════════════════════════════════════════
ÖZET
───────────────────────────────────────────────────────────
✅ Bu script /app/scripts/ altında: reserve_mrxozdemir_100.py
✅ 188 → 288 olur (100 yer kilitlenmiş, gerçek kapasiteyi
   doldurmayı engelliyor)
✅ İsimleri girince admin panelden tek tek kolayca dolduracaksınız
✅ Boş kalan rezervasyonları silmek istersen:
   admin panelden tek tek silebilir veya
   db.guests.deleteMany({is_reserved: true, name: /^No Name/})
═══════════════════════════════════════════════════════════
"""
