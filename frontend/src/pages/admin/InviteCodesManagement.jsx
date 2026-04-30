import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  KeyRound, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check,
  Edit2, X, Save, Calendar, Users, Ticket, Store, Infinity as InfinityIcon, AlertCircle
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const VALID_FOR_LABEL = {
  both: { label: "Zirve + Fuar", color: "bg-summit-navy text-white" },
  summit: { label: "Sadece Zirve", color: "bg-blue-100 text-summit-navy" },
  fair: { label: "Sadece Fuar", color: "bg-amber-100 text-amber-800" },
};

export default function InviteCodesManagement() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const emptyForm = { code: "", label: "", valid_for: "both", max_uses: 0, is_active: true, expires_at: "" };
  const [form, setForm] = useState(emptyForm);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/invite-codes`, { withCredentials: true });
      setCodes(data);
    } catch {
      setError("Davet kodları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await axios.put(`${API}/admin/invite-codes/${editingId}`, {
          label: form.label,
          valid_for: form.valid_for,
          max_uses: parseInt(form.max_uses) || 0,
          is_active: form.is_active,
          expires_at: form.expires_at || null,
        }, { withCredentials: true });
      } else {
        await axios.post(`${API}/admin/invite-codes`, {
          code: form.code.trim().toUpperCase(),
          label: form.label,
          valid_for: form.valid_for,
          max_uses: parseInt(form.max_uses) || 0,
          is_active: form.is_active,
          expires_at: form.expires_at || null,
        }, { withCredentials: true });
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      fetchCodes();
    } catch (err) {
      setError(err.response?.data?.detail || "Kayıt sırasında hata oluştu.");
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`'${code}' kodunu silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`${API}/admin/invite-codes/${id}`, { withCredentials: true });
      fetchCodes();
    } catch {
      setError("Silme işlemi başarısız.");
    }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await axios.put(`${API}/admin/invite-codes/${id}`, { is_active: !current }, { withCredentials: true });
      fetchCodes();
    } catch {
      setError("Durum değiştirilemedi.");
    }
  };

  const handleEdit = (code) => {
    setEditingId(code.id);
    setForm({
      code: code.code,
      label: code.label || "",
      valid_for: code.valid_for || "both",
      max_uses: code.max_uses || 0,
      is_active: code.is_active !== false,
      expires_at: code.expires_at ? code.expires_at.split("T")[0] : "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setError("");
  };

  const copyToClipboard = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-5" data-testid="invite-codes-page">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <KeyRound size={24} /> Davet Kodları
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ziyaretçi kayıtları için davet kodu oluşturun. Bu kod olmadan kayıt yapılamaz.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setEditingId(null); setForm(emptyForm); }}
          className="bg-summit-navy text-white rounded-md px-5 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-summit-navy-dark transition-colors"
          data-testid="btn-new-code"
        >
          {showForm && !editingId ? <X size={16} /> : <Plus size={16} />}
          {showForm && !editingId ? "İptal" : "Yeni Kod Oluştur"}
        </button>
      </div>

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4" data-testid="invite-code-form">
          <h2 className="font-heading text-summit-navy text-lg font-semibold">
            {editingId ? "Kodu Düzenle" : "Yeni Davet Kodu"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Kod *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                disabled={!!editingId}
                placeholder="VIP2026"
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy uppercase tracking-wider font-bold disabled:bg-gray-100"
                data-testid="form-code"
              />
              <p className="text-xs text-gray-500 mt-1">{editingId ? "Kod değiştirilemez" : "Otomatik büyük harfe çevrilir"}</p>
            </div>
            <div>
              <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Açıklama / Not</label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm({...form, label: e.target.value})}
                placeholder="Örn: Sponsor davetiyesi, VIP misafir"
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="form-label"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Geçerlilik</label>
              <select
                value={form.valid_for}
                onChange={e => setForm({...form, valid_for: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="form-valid-for"
              >
                <option value="both">Zirve + Fuar (her ikisi)</option>
                <option value="summit">Sadece Zirve</option>
                <option value="fair">Sadece Fuar</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Kullanım Limiti</label>
              <input
                type="number"
                min={0}
                value={form.max_uses}
                onChange={e => setForm({...form, max_uses: e.target.value})}
                placeholder="0"
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="form-max-uses"
              />
              <p className="text-xs text-gray-500 mt-1">0 = sınırsız kullanım</p>
            </div>
            <div>
              <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Son Kullanma (opsiyonel)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm({...form, expires_at: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="form-expires-at"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({...form, is_active: e.target.checked})}
              className="w-4 h-4 accent-summit-navy"
              data-testid="form-is-active"
            />
            <span className="text-sm text-gray-700">Aktif (bu kod hemen kullanılabilir olsun)</span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-summit-navy text-white rounded-md px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 hover:bg-summit-navy-dark transition-colors"
              data-testid="form-submit"
            >
              <Save size={15} /> {editingId ? "Güncelle" : "Oluştur"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="bg-gray-100 text-summit-navy rounded-md px-5 py-2.5 text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {/* CODES TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="codes-table-wrapper">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Yükleniyor…</div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center">
            <KeyRound size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Henüz davet kodu oluşturmadınız.</p>
            <p className="text-gray-400 text-xs mt-1">"Yeni Kod Oluştur" ile başlayın.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-summit-paper border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Kod</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Açıklama</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Geçerlilik</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Kullanım</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Son Tarih</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">Durum</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-gray-600 font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const validFor = VALID_FOR_LABEL[c.valid_for || "both"];
                  const exhausted = c.max_uses > 0 && c.used_count >= c.max_uses;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-summit-paper/50 transition-colors" data-testid={`code-row-${c.code}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-summit-navy bg-summit-paper px-2 py-0.5 rounded">{c.code}</code>
                          <button
                            onClick={() => copyToClipboard(c.id, c.code)}
                            className="text-gray-400 hover:text-summit-navy transition-colors"
                            title="Kopyala"
                            data-testid={`copy-${c.code}`}
                          >
                            {copiedId === c.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.label || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[0.65rem] uppercase font-bold tracking-wider px-2 py-1 rounded ${validFor.color}`}>
                          {validFor.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Users size={13} className="text-gray-400" />
                          <strong>{c.used_count || 0}</strong>
                          {c.max_uses > 0 ? (
                            <span className="text-gray-400">/ {c.max_uses}</span>
                          ) : (
                            <InfinityIcon size={13} className="text-gray-400" />
                          )}
                          {exhausted && <span className="text-[0.65rem] text-red-600 font-bold ml-1">DOLU</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {c.expires_at ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(c.expires_at).toLocaleDateString("tr-TR")}
                          </span>
                        ) : <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(c.id, c.is_active)}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors
                            ${c.is_active ? "text-green-700" : "text-gray-400"}`}
                          data-testid={`toggle-${c.code}`}
                        >
                          {c.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          {c.is_active ? "Aktif" : "Pasif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleEdit(c)}
                            className="p-1.5 text-gray-500 hover:text-summit-navy hover:bg-summit-paper rounded transition-colors"
                            title="Düzenle"
                            data-testid={`edit-${c.code}`}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.code)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Sil"
                            data-testid={`delete-${c.code}`}
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

      {/* HELP */}
      <div className="bg-summit-paper border border-gray-200 rounded-xl p-5 text-xs text-gray-600 leading-relaxed">
        <p className="font-semibold text-summit-navy mb-2 flex items-center gap-1.5"><Ticket size={14} /> Davet Kodu Nasıl Çalışır?</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ziyaretçiler kayıt formunda kodu girer ve "Doğrula" butonuna basar.</li>
          <li>Sistem kodu kontrol eder; geçerliyse yeşil onay verir.</li>
          <li>Kayıt başarıyla tamamlandığında kodun "Kullanım" sayacı 1 artar.</li>
          <li>"Kullanım Limiti" 0 ise kod sınırsız kullanılabilir; n ise n kez kullanılabilir.</li>
          <li>Kodu istediğiniz zaman <strong>Pasif</strong> yapabilir veya silebilirsiniz.</li>
          <li>Aynı kodu hem Zirve hem Fuar için (Zirve+Fuar) ya da sadece bir tipi için tanımlayabilirsiniz.</li>
        </ul>
      </div>
    </div>
  );
}
