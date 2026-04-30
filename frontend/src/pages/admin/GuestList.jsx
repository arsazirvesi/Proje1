import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Trash2, Search, Download, Send, X, ExternalLink, Eye, Filter } from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import { exportXLSX } from "../../lib/xlsx";

const STATUS_OPTIONS = [
  { value: "all", label: "Tümü", cls: "" },
  { value: "new", label: "Yeni", cls: "status-new" },
  { value: "contacted", label: "İletişim Kuruldu", cls: "status-contacted" },
  { value: "approved", label: "Onaylandı", cls: "status-approved" },
  { value: "rejected", label: "Reddedildi", cls: "status-rejected" },
];

const VISIT_FILTERS = [
  { value: "all", label: "Hepsi" },
  { value: "summit", label: "Zirve" },
  { value: "fair", label: "Fuar" },
];

const VERIFIED_FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "yes", label: "Doğrulanmış" },
  { value: "no", label: "Bekleyen" },
];

function VerifiedBadge({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-green-50 text-green-700 border border-green-200">
      ✓ Doğrulandı
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      ⏱ Bekliyor
    </span>
  );
}

function VisitTypeBadge({ type }) {
  const isSummit = !type || type === "summit";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-semibold uppercase tracking-wider
        ${isSummit ? "bg-summit-navy/10 text-summit-navy" : "bg-summit-accent/20 text-summit-navy"}`}
    >
      {isSummit ? "Zirve" : "Fuar"}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[1];
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>;
}

export default function GuestList({ forcedVisitType, title, subtitle }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visitFilter, setVisitFilter] = useState(forcedVisitType || "all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", content: "" });
  const [detail, setDetail] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      // forcedVisitType overrides UI filter
      const effectiveVisit = forcedVisitType || visitFilter;
      if (effectiveVisit !== "all") params.visit_type = effectiveVisit;
      if (verifiedFilter !== "all") params.verified = verifiedFilter;
      if (search) params.q = search;
      const { data } = await axios.get(`${API}/admin/guests`, { params, withCredentials: true });
      setItems(data);
    } catch { /* empty */ }
    setLoading(false);
  }, [statusFilter, visitFilter, verifiedFilter, search, forcedVisitType]);

  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu ziyaretçi kaydını silmek istediğinizden emin misiniz?")) return;
    try {
      await axios.delete(`${API}/admin/guests/${id}`, { withCredentials: true });
      setItems(g => g.filter(x => x.id !== id));
      setMsg("Ziyaretçi silindi.");
    } catch {}
  };

  const handleUpdateStatus = async (id, status, admin_notes) => {
    try {
      await axios.patch(`${API}/admin/guests/${id}`, { status, admin_notes }, { withCredentials: true });
      setItems(g => g.map(x => x.id === id ? {...x, status, admin_notes} : x));
      if (detail?.id === id) setDetail({...detail, status, admin_notes});
      setMsg("Güncellendi");
    } catch { setMsg("Güncelleme başarısız"); }
  };

  const handleSendBulk = async () => {
    if (!emailForm.subject || !emailForm.content) return;
    setSending(true);
    try {
      const { data } = await axios.post(`${API}/admin/email/send`,
        { ...emailForm, recipient_type: "guests" },
        { withCredentials: true }
      );
      setMsg(data.message);
      setEmailModal(false);
      setEmailForm({ subject: "", content: "" });
    } catch { setMsg("Email gönderilemedi."); }
    setSending(false);
  };

  const exportCSV = () => {
    const showType = !forcedVisitType;
    const headers = showType
      ? ["Sıra", "Ziyaret Tipi", "Doğrulama", "Ad", "Email", "Telefon", "Şirket", "Unvan", "Şehir", "Katılımcı Türü", "İlgi Alanı", "Durum", "Kayıt Tarihi", "Doğrulama Tarihi"]
      : ["Sıra", "Doğrulama", "Ad", "Email", "Telefon", "Şirket", "Unvan", "Şehir", "Katılımcı Türü", "İlgi Alanı", "Durum", "Kayıt Tarihi", "Doğrulama Tarihi"];
    const rows = [headers];
    items.forEach((g, i) => {
      const verifiedStr = g.is_verified ? "Evet" : "Bekliyor";
      const verifiedAt = g.verified_at ? g.verified_at.slice(0, 10) : "";
      const base = [g.name, g.email, g.phone || "", g.company || "", g.title || "", g.city || "",
        g.participant_type || "", g.interest_area || "", g.status || "new", g.created_at?.slice(0,10), verifiedAt];
      rows.push(showType
        ? [i + 1, (g.visit_type || "summit") === "fair" ? "Fuar" : "Zirve", verifiedStr, ...base]
        : [i + 1, verifiedStr, ...base]);
    });
    const filename = forcedVisitType === "summit" ? "zirve-ziyaretcileri"
                   : forcedVisitType === "fair" ? "fuar-ziyaretcileri"
                   : "ziyaretciler";
    exportXLSX(rows, filename, "Ziyaretçiler");
  };

  const BACKEND = API.replace(/\/api$/, "");

  const summitItems = items.filter(i => (i.visit_type || "summit") === "summit");
  const fairItems = items.filter(i => i.visit_type === "fair");
  const summitCount = summitItems.length;
  const fairCount = fairItems.length;
  const summitVerified = summitItems.filter(i => i.is_verified).length;
  const fairVerified = fairItems.filter(i => i.is_verified).length;
  const pendingCount = items.filter(i => !i.is_verified).length;
  const SUMMIT_CAPACITY = 600;

  const counts = STATUS_OPTIONS.reduce((acc, o) => {
    acc[o.value] = o.value === "all" ? items.length : items.filter(i => (i.status || "new") === o.value).length;
    return acc;
  }, {});

  return (
    <div data-testid="guest-list-page">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">
            {title || "Ziyaretçi Kayıtları"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {forcedVisitType === "summit" ? (
              <>
                Toplam <strong className="text-summit-navy">{items.length}</strong> kayıt ·
                <span className="ml-1.5">Doğrulanmış <strong className="text-green-600">{summitVerified}</strong>/{SUMMIT_CAPACITY}</span> ·
                <span className="ml-1.5">Bekleyen <strong className="text-amber-600">{pendingCount}</strong></span>
              </>
            ) : forcedVisitType === "fair" ? (
              <>
                Toplam <strong className="text-summit-navy">{items.length}</strong> kayıt ·
                <span className="ml-1.5">Doğrulanmış <strong className="text-green-600">{fairVerified}</strong></span> ·
                <span className="ml-1.5">Bekleyen <strong className="text-amber-600">{pendingCount}</strong></span>
              </>
            ) : (
              <>
                Toplam <strong className="text-summit-navy">{items.length}</strong> kayıt ·
                <span className="ml-1.5">Zirve <strong className="text-green-600">{summitVerified}</strong>/{summitCount}</span> ·
                <span className="ml-1.5">Fuar <strong className="text-green-600">{fairVerified}</strong>/{fairCount}</span> ·
                <span className="ml-1.5 text-amber-600">Bekleyen {pendingCount}</span>
              </>
            )}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700 text-sm hover:border-summit-navy/30">
            <Download size={14} /> Excel İndir
          </button>
          <button onClick={() => setEmailModal(true)} className="btn-navy flex items-center gap-2 px-4 py-2 text-sm" data-testid="send-guest-email-btn">
            <Send size={14} /> Toplu Email
          </button>
        </div>
      </div>

      {/* Capacity bar — only for summit or combined view */}
      {(!forcedVisitType || forcedVisitType === "summit") && (
        <div className="bg-white border border-gray-200 rounded-md p-3 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-summit-navy font-semibold">Zirve Kontenjanı (600 kişi)</span>
            <span className="text-gray-500">
              {forcedVisitType === "summit" ? items.length : summitCount}/{SUMMIT_CAPACITY} dolu ·
              {" "}{Math.max(0, SUMMIT_CAPACITY - (forcedVisitType === "summit" ? items.length : summitCount))} yer kaldı
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                (forcedVisitType === "summit" ? items.length : summitCount) >= SUMMIT_CAPACITY
                  ? "bg-red-500"
                  : (forcedVisitType === "summit" ? items.length : summitCount) / SUMMIT_CAPACITY > 0.8
                  ? "bg-summit-accent"
                  : "bg-summit-navy"
              }`}
              style={{ width: `${Math.min(100, ((forcedVisitType === "summit" ? items.length : summitCount) / SUMMIT_CAPACITY) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {msg && (
        <div className="bg-summit-navy/5 border border-summit-navy/30 rounded-md p-3 text-summit-navy text-sm mb-5 flex items-center justify-between">
          {msg}
          <button onClick={() => setMsg("")}><X size={14} /></button>
        </div>
      )}

      {/* Visit type filters — only show on combined view */}
      {!forcedVisitType && (
        <div className="bg-white border border-gray-200 rounded-md p-3 mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 ml-1 uppercase tracking-wider">Ziyaret Tipi:</span>
          {VISIT_FILTERS.map(o => (
            <button
              key={o.value}
              onClick={() => setVisitFilter(o.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                visitFilter === o.value ? "bg-summit-navy text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
              data-testid={`filter-visit-${o.value}`}
            >
              {o.label}
              {o.value === "summit" && <span className="opacity-70 ml-1">({summitCount})</span>}
              {o.value === "fair" && <span className="opacity-70 ml-1">({fairCount})</span>}
              {o.value === "all" && <span className="opacity-70 ml-1">({summitCount + fairCount})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Verified filter */}
      <div className="bg-white border border-gray-200 rounded-md p-3 mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 ml-1 uppercase tracking-wider">E-posta Doğrulaması:</span>
        {VERIFIED_FILTERS.map(o => (
          <button
            key={o.value}
            onClick={() => setVerifiedFilter(o.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              verifiedFilter === o.value
                ? (o.value === "yes" ? "bg-green-600 text-white" : o.value === "no" ? "bg-amber-600 text-white" : "bg-summit-navy text-white")
                : "text-gray-600 hover:bg-gray-100"
            }`}
            data-testid={`filter-verified-${o.value}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="bg-white border border-gray-200 rounded-md p-3 mb-4 flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-gray-400 ml-1" />
        {STATUS_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => setStatusFilter(o.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              statusFilter === o.value ? "bg-summit-navy text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
            data-testid={`filter-status-${o.value}`}
          >
            {o.label} <span className="opacity-70">({counts[o.value] || 0})</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              placeholder="İsim, email, şirket, telefon ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none max-w-md"
              data-testid="guest-search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-summit-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th>Ad Soyad</th>
                  {!forcedVisitType && <th className="hidden sm:table-cell">Tip</th>}
                  <th className="hidden sm:table-cell">Doğrulama</th>
                  <th>E-posta</th>
                  <th className="hidden md:table-cell">Telefon</th>
                  <th className="hidden lg:table-cell">Şirket</th>
                  <th>Durum</th>
                  <th className="hidden sm:table-cell">Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={forcedVisitType ? 9 : 10} className="text-center py-10 text-gray-500">Kayıt bulunamadı</td></tr>
                )}
                {items.map((g, i) => (
                  <tr key={g.id} data-testid={`guest-row-${g.id}`}>
                    <td className="text-center text-gray-400 font-mono text-xs font-semibold" data-testid={`guest-seq-${i + 1}`}>
                      #{i + 1}
                    </td>
                    <td className="text-summit-navy font-medium">{g.name}</td>
                    {!forcedVisitType && <td className="hidden sm:table-cell"><VisitTypeBadge type={g.visit_type} /></td>}
                    <td className="hidden sm:table-cell"><VerifiedBadge verified={!!g.is_verified} /></td>
                    <td className="text-gray-600">{g.email}</td>
                    <td className="hidden md:table-cell">{g.phone || "-"}</td>
                    <td className="hidden lg:table-cell">{g.company || "-"}</td>
                    <td><StatusBadge status={g.status || "new"} /></td>
                    <td className="hidden sm:table-cell">{g.created_at?.slice(0,10)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetail(g)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-summit-navy/10 text-summit-navy hover:bg-summit-navy/20 transition-colors"
                          title="Detay"
                          data-testid={`view-guest-${g.id}`}
                        ><Eye size={13} /></button>
                        <a
                          href={`${BACKEND}/api/badge/${g.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 flex items-center justify-center rounded bg-summit-navy/10 text-summit-navy hover:bg-summit-navy/20 transition-colors"
                          title="Yaka Kartı"
                          data-testid={`badge-btn-${g.id}`}
                        ><ExternalLink size={13} /></a>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          data-testid={`delete-guest-${g.id}`}
                        ><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex" data-testid="guest-detail-drawer">
          <div className="absolute inset-0 bg-summit-navy/40" onClick={() => setDetail(null)} />
          <div className="relative ml-auto h-full w-full max-w-xl bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="font-heading text-summit-navy text-xl">Ziyaretçi Detayı</h3>
              <button onClick={() => setDetail(null)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              {[
                ["Ad Soyad", detail.name],
                ["E-posta", detail.email],
                ["Telefon", detail.phone],
                ["Şirket", detail.company],
                ["Unvan", detail.title],
                ["Şehir", detail.city],
                ["Katılımcı Türü", detail.participant_type],
                ["İlgi Alanı", detail.interest_area],
                ["Beklentiler", detail.expectations],
                ["Kayıt Tarihi", detail.created_at?.slice(0,16).replace("T", " ")],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{k}</div>
                  <div className="text-summit-navy text-sm">{v}</div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Durum</label>
                <select value={detail.status || "new"}
                  onChange={(e) => handleUpdateStatus(detail.id, e.target.value, detail.admin_notes || "")}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                  data-testid="detail-status-select">
                  {STATUS_OPTIONS.filter(o => o.value !== "all").map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Admin Notları</label>
                <textarea rows={4} value={detail.admin_notes || ""}
                  onChange={(e) => setDetail({...detail, admin_notes: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none resize-none"
                  placeholder="Notlarınızı buraya yazın..."
                  data-testid="detail-notes-input" />
                <button onClick={() => handleUpdateStatus(detail.id, detail.status || "new", detail.admin_notes || "")}
                  className="btn-navy px-5 py-2 mt-3 text-sm">
                  Notları Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-white border border-gray-200 rounded-md p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">Ziyaretçilere Email Gönder</h3>
              <button onClick={() => setEmailModal(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <p className="text-gray-500 text-xs mb-5">{items.length} ziyaretçiye email gönderilecektir.</p>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">Konu</label>
                <input type="text" placeholder="Email konusu" value={emailForm.subject}
                  onChange={e => setEmailForm({...emailForm, subject: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                  data-testid="guest-email-subject" />
              </div>
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">İçerik (HTML)</label>
                <textarea placeholder="Email içeriği..." rows={6} value={emailForm.content}
                  onChange={e => setEmailForm({...emailForm, content: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none resize-none"
                  data-testid="guest-email-content" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEmailModal(false)} className="btn-outline-navy px-5 py-2.5">İptal</button>
                <button onClick={handleSendBulk} disabled={sending} className="btn-navy px-5 py-2.5 flex items-center gap-2" data-testid="confirm-guest-email-btn">
                  <Send size={14} />{sending ? "Gönderiliyor..." : "Gönder"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
