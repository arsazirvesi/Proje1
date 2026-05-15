import React, { useEffect, useState } from "react";
import axios from "axios";
import { Crown, Trophy, Medal, Gem, Save, Check, AlertCircle, Tag, BadgeCheck } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const ICON_MAP = {
  ana: Crown,
  altin: Trophy,
  gumus: Medal,
  bronz: Gem,
};

const ACCENT_MAP = {
  ana: "bg-summit-navy",
  altin: "bg-amber-500",
  gumus: "bg-slate-500",
  bronz: "bg-orange-600",
};

export default function SponsorPackagesManagement() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/sponsor-packages`, { withCredentials: true });
      setPackages(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Paketler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = (key, field, value) => {
    setPackages(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
  };

  const save = async (pkg) => {
    setSavingKey(pkg.key);
    setError("");
    try {
      await axios.put(`${API}/admin/sponsor-packages/${pkg.key}`,
        { price_label: pkg.price_label, sold_out: pkg.sold_out, label: pkg.label },
        { withCredentials: true });
      setSavedKey(pkg.key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch (e) {
      setError(e?.response?.data?.detail || "Kaydedilemedi");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 text-sm">Yükleniyor...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-summit-navy">Sponsor Paket Fiyatları</h1>
        <p className="text-gray-600 text-sm mt-1.5">
          Konuşmacı/Sponsor başvuru sayfasında görünen 4 paketin <strong>fiyat etiketini</strong> ve
          <strong> "Sahibini Buldu"</strong> (sold out) durumunu buradan düzenleyebilirsiniz.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="sponsor-packages-grid">
        {packages.map(pkg => {
          const Icon = ICON_MAP[pkg.key] || Crown;
          const accent = ACCENT_MAP[pkg.key] || "bg-summit-navy";
          const saving = savingKey === pkg.key;
          const saved = savedKey === pkg.key;
          return (
            <div key={pkg.key}
              className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              data-testid={`pkg-card-${pkg.key}`}
            >
              {/* Accent bar */}
              <div className={`h-1.5 ${accent}`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center shrink-0`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-summit-navy text-lg font-bold truncate">{pkg.label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">key: {pkg.key}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <Tag size={11} /> Fiyat Etiketi
                  </label>
                  <input
                    type="text"
                    value={pkg.price_label || ""}
                    onChange={e => updateField(pkg.key, "price_label", e.target.value)}
                    placeholder="örn: ₺250.000+ · Talep Üzerine · Sahibini Buldu"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-navy transition-colors"
                    data-testid={`pkg-price-${pkg.key}`}
                  />
                  <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">
                    Boş bırakırsanız fiyat etiketi paket kartında görünmez. Para birimi/format size kalmış (örn. ₺, $, €).
                  </p>
                </div>

                {/* Sold out toggle */}
                <div className="mb-4">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <BadgeCheck size={11} /> Durum
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateField(pkg.key, "sold_out", false)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                        !pkg.sold_out
                          ? "bg-emerald-600 text-white border-emerald-700"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                      data-testid={`pkg-available-${pkg.key}`}
                    >
                      Müsait
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField(pkg.key, "sold_out", true)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                        pkg.sold_out
                          ? "bg-red-600 text-white border-red-700"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                      data-testid={`pkg-soldout-${pkg.key}`}
                    >
                      Sahibini Buldu
                    </button>
                  </div>
                </div>

                {/* Save */}
                <button
                  onClick={() => save(pkg)}
                  disabled={saving}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 transition-all ${
                    saved
                      ? "bg-emerald-600 text-white"
                      : "bg-summit-navy hover:bg-summit-navy-dark text-white disabled:opacity-50"
                  }`}
                  data-testid={`pkg-save-${pkg.key}`}
                >
                  {saved ? (<><Check size={14} /> Kaydedildi</>) : (<><Save size={14} /> {saving ? "Kaydediliyor..." : "Kaydet"}</>)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 leading-relaxed">
        <strong>İpucu:</strong> "Sahibini Buldu" durumu açıldığında ilgili pakette kırmızı "VERİLDİ" şeridi görünür ve "Bu Paketi Seç"
        butonu devre dışı kalır. Fiyat etiketi paket başlığının hemen altında öne çıkar.
      </div>
    </div>
  );
}
