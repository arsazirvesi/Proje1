import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  KeyRound, Plus, Trash2, Copy, Check, ToggleLeft, ToggleRight, X,
  AlertCircle, Eye, EyeOff, Shield, Code as CodeIcon, FileText, Smartphone, ExternalLink
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const VALID_FOR_LABEL = {
  both: { label: "Zirve + Fuar", color: "bg-summit-navy text-white" },
  summit: { label: "Sadece Zirve", color: "bg-blue-100 text-summit-navy" },
  fair: { label: "Sadece Fuar", color: "bg-amber-100 text-amber-800" },
};

export default function ApiKeysManagement() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", valid_for: "fair" });
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);
  const [revealedId, setRevealedId] = useState(null);
  const [showDocs, setShowDocs] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/api-keys`, { withCredentials: true });
      setKeys(data);
    } catch {
      setError("API anahtarları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API}/admin/api-keys`, form, { withCredentials: true });
      setForm({ label: "", valid_for: "fair" });
      setShowForm(false);
      fetchKeys();
    } catch (err) {
      setError(err.response?.data?.detail || "Oluşturma hatası.");
    }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`'${label}' anahtarını silmek istediğinize emin misiniz?\nSilinen anahtar bir daha çalışmaz.`)) return;
    try {
      await axios.delete(`${API}/admin/api-keys/${id}`, { withCredentials: true });
      fetchKeys();
    } catch {
      setError("Silme başarısız.");
    }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await axios.put(`${API}/admin/api-keys/${id}`, { is_active: !current }, { withCredentials: true });
      fetchKeys();
    } catch {
      setError("Durum değiştirilemedi.");
    }
  };

  const copyKey = (id, key) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const scanLinkFor = (key) => {
    const origin = (typeof window !== "undefined") ? window.location.origin : "";
    return `${origin}/tarama/${key}`;
  };

  const copyScanLink = (id, key) => {
    navigator.clipboard.writeText(scanLinkFor(key));
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 1800);
  };

  const maskedKey = (key) => key.slice(0, 6) + "•".repeat(20) + key.slice(-4);

  return (
    <div className="space-y-5" data-testid="api-keys-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield size={24} /> API Anahtarları
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Üçüncü taraf sistemlerin (örn. fuar şirketi tarayıcıları) yaka kartlarımızı doğrulayabilmesi için API anahtarı oluşturun.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDocs(s => !s)}
            className="inline-flex items-center justify-center gap-2 bg-white text-summit-navy border border-gray-200 hover:bg-summit-paper rounded-md px-4 py-2.5 text-sm font-semibold transition-colors"
            data-testid="btn-toggle-docs"
          >
            <FileText size={15} /> {showDocs ? "Dokümantasyonu Kapat" : "Dokümantasyon"}
          </button>
          <button
            onClick={() => setShowForm(s => !s)}
            className="inline-flex items-center justify-center gap-2 bg-summit-navy text-white rounded-md px-5 py-2.5 text-sm font-semibold hover:bg-summit-navy-dark transition-colors"
            data-testid="btn-new-api-key"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "İptal" : "Yeni Anahtar"}
          </button>
        </div>
      </div>

      {/* INFO BANNER about mobile scan link */}
      <div className="bg-summit-gold/10 border border-summit-gold/40 rounded-xl p-4 flex items-start gap-3" data-testid="mobile-link-info">
        <Smartphone size={20} className="text-summit-navy shrink-0 mt-0.5" />
        <div className="text-sm text-summit-navy leading-relaxed">
          <strong className="block mb-0.5">Görevliler için Mobil Tarama Linki</strong>
          <span className="text-summit-navy/80 text-xs sm:text-sm">
            Her anahtarın yanındaki <em>"Mobil Link"</em> butonu, login gerektirmeyen bir QR tarama sayfasına yönlendiren özel bir bağlantı verir.
            Linki kapıdaki görevlinize gönderin, telefonda açıp kamerayı başlatsınlar — tarayıcıyı her açtıklarında tekrar giriş yapmaları gerekmez.
            Anahtarı pasif yaparsanız link de anında çalışmaz.
          </span>
        </div>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4" data-testid="api-key-form">
          <h2 className="font-heading text-summit-navy text-lg font-semibold">Yeni API Anahtarı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Etiket / Açıklama *</label>
              <input
                type="text"
                required
                value={form.label}
                onChange={e => setForm({...form, label: e.target.value})}
                placeholder="JNR Fuar Şirketi - Tarayıcı Sistemi"
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="form-label"
              />
              <p className="text-xs text-gray-500 mt-1">Hangi firma/sistem için olduğunu yazın</p>
            </div>
            <div>
              <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Yetki Alanı</label>
              <select
                value={form.valid_for}
                onChange={e => setForm({...form, valid_for: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="form-valid-for"
              >
                <option value="fair">Sadece Fuar Ziyaretçileri</option>
                <option value="summit">Sadece Zirve Ziyaretçileri</option>
                <option value="both">Zirve + Fuar (her ikisi)</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>Anahtar yalnızca bir kez gösterilir. Oluşturduktan sonra ilgili firmaya güvenli bir kanaldan iletin.</span>
          </div>
          <button
            type="submit"
            className="bg-summit-navy text-white rounded-md px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 hover:bg-summit-navy-dark transition-colors"
            data-testid="form-submit"
          >
            <Plus size={15} /> Anahtarı Oluştur
          </button>
        </form>
      )}

      {/* DOCS */}
      {showDocs && <ApiDocs />}

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Yükleniyor…</div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Henüz API anahtarı oluşturmadınız.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-summit-paper border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Etiket</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Anahtar</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Yetki</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Kullanım</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Son Kullanım</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Durum</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => {
                  const validFor = VALID_FOR_LABEL[k.valid_for || "both"];
                  const revealed = revealedId === k.id;
                  return (
                    <tr key={k.id} className="border-b border-gray-100 hover:bg-summit-paper/50">
                      <td className="px-4 py-3 text-summit-navy font-medium max-w-xs truncate">{k.label}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="bg-summit-paper px-2 py-0.5 rounded text-summit-navy" data-testid={`api-key-display-${k.id}`}>
                            {revealed ? k.key : maskedKey(k.key)}
                          </span>
                          <button
                            onClick={() => setRevealedId(revealed ? null : k.id)}
                            className="text-gray-400 hover:text-summit-navy"
                            title={revealed ? "Gizle" : "Göster"}
                          >
                            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => copyKey(k.id, k.key)}
                            className="text-gray-400 hover:text-summit-navy"
                            title="Kopyala"
                            data-testid={`copy-key-${k.id}`}
                          >
                            {copiedId === k.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[0.65rem] uppercase font-bold tracking-wider px-2 py-1 rounded ${validFor.color}`}>
                          {validFor.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-summit-navy font-semibold">{k.usage_count || 0}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString("tr-TR") : <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(k.id, k.is_active)}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${k.is_active ? "text-green-700" : "text-gray-400"}`}
                          data-testid={`toggle-${k.id}`}
                        >
                          {k.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          {k.is_active ? "Aktif" : "Pasif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            onClick={() => copyScanLink(k.id, k.key)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-summit-navy bg-summit-paper hover:bg-summit-gold/10 border border-gray-200 px-2.5 py-1.5 rounded transition-colors"
                            title="Mobil tarama linkini kopyala (görevliye gönder)"
                            data-testid={`copy-scan-link-${k.id}`}
                          >
                            {copiedLinkId === k.id ? <Check size={13} className="text-green-600" /> : <Smartphone size={13} />}
                            {copiedLinkId === k.id ? "Kopyalandı" : "Mobil Link"}
                          </button>
                          <a
                            href={scanLinkFor(k.key)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-summit-navy hover:bg-summit-paper rounded transition-colors"
                            title="Mobil tarama sayfasını aç"
                            data-testid={`open-scan-link-${k.id}`}
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => handleDelete(k.id, k.label)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Sil"
                            data-testid={`delete-${k.id}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApiDocs() {
  const baseUrl = (typeof window !== "undefined") ? window.location.origin : "https://arsayatirimzirvesi.com";
  const block = "bg-summit-navy text-white p-4 rounded-md text-xs font-mono whitespace-pre overflow-x-auto leading-relaxed";

  return (
    <div className="bg-white border border-summit-accent/30 rounded-xl p-6 space-y-5" data-testid="api-docs">
      <div>
        <h2 className="font-heading text-summit-navy text-xl font-bold flex items-center gap-2">
          <CodeIcon size={20} /> API Dokümantasyonu
        </h2>
        <p className="text-gray-600 text-sm mt-1">3. parti firmaların yaka kartı QR kodlarını doğrulamak için kullanacağı endpoint'ler.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h3 className="font-semibold text-summit-navy">1. Check-in (QR doğrulama)</h3>
          <p className="text-xs text-gray-600">Yaka kartını okutunca giriş onayı verir + DB'de "geldi" işaretler.</p>
          <pre className={block}>{`POST ${baseUrl}/api/external/checkin
Headers:
  Content-Type: application/json
  X-API-Key: ayz_xxxxxxxxxxxxxxxxx

Body:
  {
    "code": "AYZ2026-69f366ba39dc2fe07b76a096",
    "mark_checkin": true
  }`}</pre>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-summit-navy">Yanıt — Olası Durumlar</h3>
          <pre className={block}>{`# Geçerli, ilk giriş
{ "status": "approved",
  "message": "Giriş onaylandı",
  "guest": {
    "name": "Ali Veli",
    "company": "ABC A.Ş.",
    "visit_label": "Fuar",
    "badge_id": "AYZ2026-...",
    "checked_in_at": "2026-05-21T08:42:00Z"
  }
}

# Daha önce giriş yapmış
{ "status": "already_checked_in", ... }

# E-posta doğrulanmamış
{ "status": "not_verified", ... }

# Kart sistemde yok
{ "status": "not_found", ... }`}</pre>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-summit-navy">2. Misafir Listesi (offline lookup)</h3>
          <p className="text-xs text-gray-600">Tüm doğrulanmış misafirlerin listesi. Offline tarayıcı için cache.</p>
          <pre className={block}>{`GET ${baseUrl}/api/external/guests?limit=1000
Headers:
  X-API-Key: ayz_xxxxxxxxxxxxxxxxx`}</pre>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-summit-navy">cURL Örneği</h3>
          <pre className={block}>{`curl -X POST ${baseUrl}/api/external/checkin \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ayz_xxxxxxxxxxxxxxxxx" \\
  -d '{
    "code": "AYZ2026-69f366ba39dc2fe07b76a096"
  }'`}</pre>
        </div>
      </div>

      <div className="bg-summit-paper border border-gray-200 rounded-lg p-4 text-xs text-gray-700 leading-relaxed">
        <p className="font-semibold text-summit-navy mb-2">📌 Notlar</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>API anahtarı, oluştururken seçtiğiniz <strong>yetki alanına</strong> göre çalışır (sadece Fuar / sadece Zirve / her ikisi).</li>
          <li><code className="bg-white px-1 rounded">"mark_checkin": false</code> gönderirseniz sistem yalnızca <em>doğrular</em>, "geldi" işaretlemez (test için kullanışlı).</li>
          <li>Anahtarınızı kaybettiyseniz/şüpheniz varsa hemen <strong>Pasif</strong> yapıp yeni bir tane oluşturun.</li>
          <li>Tüm istekler HTTPS üzerinden olmalıdır. Anahtarı asla istemci taraflı kodda (mobile app/JS) saklamayın.</li>
        </ul>
      </div>
    </div>
  );
}
