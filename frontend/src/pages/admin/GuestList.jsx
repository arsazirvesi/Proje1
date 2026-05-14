import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Trash2, Search, Download, Send, X, ExternalLink, Eye, Filter, BookmarkPlus, AlertCircle } from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import { exportXLSX } from "../../lib/xlsx";

const STATUS_OPTIONS = [
  { value: "all", label: "Tümü", cls: "" },
  { value: "new", label: "Yeni", cls: "status-new" },
  { value: "reserved", label: "Rezerve", cls: "status-reserved" },
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

function CheckedInBadge({ guest }) {
  if (guest.checked_in) {
    const at = guest.checked_in_at ? new Date(guest.checked_in_at) : null;
    const timeStr = at ? at.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-bold bg-green-500 text-white shadow-sm"
        title={`Giriş yapıldı: ${timeStr}`}
      >
        ✓ GELDİ {timeStr && <span className="font-normal opacity-90 ml-0.5">· {timeStr}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-gray-100 text-gray-500 border border-gray-200">
      Bekliyor
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
  const [reserveModal, setReserveModal] = useState(false);
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
      ? ["Sıra", "Ziyaret Tipi", "Doğrulama", "Etkinlik Girişi", "Giriş Saati", "Ad", "Email", "Telefon", "Şirket", "Unvan", "Şehir", "Katılımcı Türü", "İlgi Alanı", "Davet Kodu", "Durum", "Kayıt Tarihi", "Doğrulama Tarihi"]
      : ["Sıra", "Doğrulama", "Etkinlik Girişi", "Giriş Saati", "Ad", "Email", "Telefon", "Şirket", "Unvan", "Şehir", "Katılımcı Türü", "İlgi Alanı", "Davet Kodu", "Durum", "Kayıt Tarihi", "Doğrulama Tarihi"];
    const rows = [headers];
    items.forEach((g, i) => {
      const verifiedStr = g.is_verified ? "Evet" : "Bekliyor";
      const verifiedAt = g.verified_at ? g.verified_at.slice(0, 10) : "";
      const checkedStr = g.checked_in ? "Geldi" : "Bekliyor";
      const checkedAt = g.checked_in_at ? new Date(g.checked_in_at).toLocaleString("tr-TR") : "";
      const base = [g.name, g.email, g.phone || "", g.company || "", g.title || "", g.city || "",
        g.participant_type || "", g.interest_area || "", g.invite_code || "", g.status || "new", g.created_at?.slice(0,10), verifiedAt];
      rows.push(showType
        ? [i + 1, (g.visit_type || "summit") === "fair" ? "Fuar" : "Zirve", verifiedStr, checkedStr, checkedAt, ...base]
        : [i + 1, verifiedStr, checkedStr, checkedAt, ...base]);
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
  const summitCheckedIn = summitItems.filter(i => i.checked_in).length;
  const fairCheckedIn = fairItems.filter(i => i.checked_in).length;
  const totalCheckedIn = items.filter(i => i.checked_in).length;
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
                <span className="ml-1.5">Bekleyen <strong className="text-amber-600">{pendingCount}</strong></span> ·
                <span className="ml-1.5">Etkinliğe Geldi <strong className="text-green-700">{summitCheckedIn}</strong></span>
              </>
            ) : forcedVisitType === "fair" ? (
              <>
                Toplam <strong className="text-summit-navy">{items.length}</strong> kayıt ·
                <span className="ml-1.5">Doğrulanmış <strong className="text-green-600">{fairVerified}</strong></span> ·
                <span className="ml-1.5">Bekleyen <strong className="text-amber-600">{pendingCount}</strong></span> ·
                <span className="ml-1.5">Fuara Geldi <strong className="text-green-700">{fairCheckedIn}</strong></span>
              </>
            ) : (
              <>
                Toplam <strong className="text-summit-navy">{items.length}</strong> kayıt ·
                <span className="ml-1.5">Zirve <strong className="text-green-600">{summitVerified}</strong>/{summitCount}</span> ·
                <span className="ml-1.5">Fuar <strong className="text-green-600">{fairVerified}</strong>/{fairCount}</span> ·
                <span className="ml-1.5 text-amber-600">Bekleyen {pendingCount}</span> ·
                <span className="ml-1.5">Geldi <strong className="text-green-700">{totalCheckedIn}</strong></span>
              </>
            )}
          </p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(!forcedVisitType || forcedVisitType === "summit") && (
            <button onClick={() => setReserveModal(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-md text-sm hover:bg-amber-100 transition-colors" data-testid="open-bulk-reserve-btn">
              <BookmarkPlus size={14} /> Toplu Rezervasyon
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-700 text-sm hover:border-summit-navy/30">
            <Download size={14} /> Excel İndir
          </button>
          <button onClick={() => setEmailModal(true)} className="btn-navy flex items-center gap-2 px-3 py-2 text-sm" data-testid="send-guest-email-btn">
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
              placeholder="İsim, email, şirket, telefon, davet kodu ara..."
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
                  <th>Etkinlik Girişi</th>
                  <th>E-posta</th>
                  <th className="hidden md:table-cell">Telefon</th>
                  <th className="hidden lg:table-cell">Şirket</th>
                  <th className="hidden md:table-cell">Davet Kodu</th>
                  <th>Durum</th>
                  <th className="hidden sm:table-cell">Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={forcedVisitType ? 11 : 12} className="text-center py-10 text-gray-500">Kayıt bulunamadı</td></tr>
                )}
                {items.map((g, i) => (
                  <tr key={g.id} data-testid={`guest-row-${g.id}`}>
                    <td className="text-center text-gray-400 font-mono text-xs font-semibold" data-testid={`guest-seq-${i + 1}`}>
                      #{i + 1}
                    </td>
                    <td className="text-summit-navy font-medium">{g.name}</td>
                    {!forcedVisitType && <td className="hidden sm:table-cell"><VisitTypeBadge type={g.visit_type} /></td>}
                    <td className="hidden sm:table-cell"><VerifiedBadge verified={!!g.is_verified} /></td>
                    <td><CheckedInBadge guest={g} /></td>
                    <td className="text-gray-600">{g.email}</td>
                    <td className="hidden md:table-cell">{g.phone || "-"}</td>
                    <td className="hidden lg:table-cell">{g.company || "-"}</td>
                    <td className="hidden md:table-cell">
                      {g.invite_code
                        ? <code className="font-mono text-xs font-bold text-summit-navy bg-summit-paper px-2 py-0.5 rounded" data-testid={`invite-code-${g.id}`}>{g.invite_code}</code>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-heading text-summit-navy text-xl">Ziyaretçi Detayı</h3>
                {detail.is_reserved && <span className="inline-block mt-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-0.5 uppercase tracking-wider">Rezerve · Bilgileri Doldurun</span>}
              </div>
              <button onClick={() => setDetail(null)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <EditableField label="Ad Soyad" value={detail.name} onChange={v => setDetail({...detail, name: v})} testid="detail-name" />
              <EditableField label="Telefon" value={detail.phone} onChange={v => setDetail({...detail, phone: v})} testid="detail-phone" />
              <EditableField label="E-posta" value={detail.email} onChange={v => setDetail({...detail, email: v})} testid="detail-email" />
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Şirket" value={detail.company} onChange={v => setDetail({...detail, company: v})} testid="detail-company" />
                <EditableField label="Unvan" value={detail.title} onChange={v => setDetail({...detail, title: v})} testid="detail-title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Şehir" value={detail.city} onChange={v => setDetail({...detail, city: v})} testid="detail-city" />
                <ReadOnlyField label="Davet Kodu" value={detail.invite_code} mono />
              </div>
              {detail.checked_in && (
                <ReadOnlyField label="Etkinlik Girişi" value={`✓ Geldi (${detail.checked_in_at ? new Date(detail.checked_in_at).toLocaleString("tr-TR") : ""})`} highlight />
              )}
              <ReadOnlyField label="Kayıt Tarihi" value={detail.created_at?.slice(0,16).replace("T", " ")} />

              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Durum</label>
                <select value={detail.status || "new"}
                  onChange={(e) => setDetail({...detail, status: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none"
                  data-testid="detail-status-select">
                  {STATUS_OPTIONS.filter(o => o.value !== "all").map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Admin Notları</label>
                <textarea rows={3} value={detail.admin_notes || ""}
                  onChange={(e) => setDetail({...detail, admin_notes: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none resize-none"
                  placeholder="Notlarınızı buraya yazın..."
                  data-testid="detail-notes-input" />
              </div>

              <div className="pt-3 border-t border-gray-200 flex gap-2 sticky bottom-0 bg-white pb-0">
                <button onClick={() => setDetail(null)} className="flex-1 btn-outline-navy py-2.5 text-sm">İptal</button>
                <button onClick={async () => {
                  try {
                    const payload = {
                      name: detail.name, phone: detail.phone, email: detail.email,
                      company: detail.company, title: detail.title, city: detail.city,
                      status: detail.status, admin_notes: detail.admin_notes,
                    };
                    const { data } = await axios.put(`${API}/admin/guests/${detail.id}`,
                      payload, { withCredentials: true });
                    setDetail(data);
                    await load();
                    alert("Kaydedildi");
                  } catch (e) {
                    alert(e?.response?.data?.detail || "Kaydedilemedi");
                  }
                }} className="flex-1 btn-navy py-2.5 text-sm" data-testid="detail-save-btn">
                  Değişiklikleri Kaydet
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

      {/* Bulk Reserve Modal */}
      {reserveModal && (
        <BulkReserveModal
          onClose={() => setReserveModal(false)}
          onDone={async () => { setReserveModal(false); await load(); }}
        />
      )}
    </div>
  );
}

function BulkReserveModal({ onClose, onDone }) {
  const [code, setCode] = useState("MRXOZDEMIR");
  const [count, setCount] = useState(100);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  const PRESETS = [
    { code: "MRXOZDEMIR", name: "Muhammet Özdemir" },
    { code: "MASTER", name: "Oğuzhan Öztürk" },
    { code: "KIRAZ", name: "Büşra Kiraz" },
    { code: "MRTGUL", name: "Murat Gültekin" },
  ];

  const submit = async () => {
    setErr(""); setResult(null);
    if (!code.trim()) return setErr("Davet kodu boş olamaz");
    if (!count || count < 1) return setErr("En az 1 kişilik rezervasyon");
    if (count > 500) return setErr("Tek seferde max 500");
    if (!window.confirm(`${count} kişilik "No Name" rezervasyonu oluşturulacak (kod: ${code}). Devam edilsin mi?`)) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/admin/guests/bulk-reserve`,
        { invite_code: code.trim().toUpperCase(), count: Number(count), note: note.trim() || null },
        { withCredentials: true });
      setResult(data);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Rezervasyon yapılamadı");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="bulk-reserve-modal">
      <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-summit-navy text-lg flex items-center gap-2"><BookmarkPlus size={18} /> Toplu Rezervasyon</h3>
            <p className="text-xs text-gray-500 mt-0.5">Bir davet kodu adına "No Name" placeholder oluşturur — sonra düzenleyip gerçek isim girebilirsiniz.</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        {!result ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5 block">Davet Kodu *</label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {PRESETS.map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setCode(p.code)}
                    className={`text-left px-2.5 py-1.5 rounded border text-xs transition-colors ${code === p.code ? "border-summit-navy bg-summit-navy/5 font-bold" : "border-gray-200 hover:border-summit-navy/40"}`}
                  >
                    <div className="text-summit-navy font-mono text-[11px]">{p.code}</div>
                    <div className="text-gray-500 text-[10px]">{p.name}</div>
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Veya manuel: KODNAME"
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm uppercase tracking-wider font-mono focus:outline-none focus:border-summit-navy"
                data-testid="reserve-code-input"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5 block">Adet *</label>
              <input
                type="number"
                min="1"
                max="500"
                value={count}
                onChange={e => setCount(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-summit-navy text-xl font-bold tabular-nums focus:outline-none focus:border-summit-navy"
                data-testid="reserve-count-input"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[10, 25, 50, 100, 200].map(n => (
                  <button key={n} type="button" onClick={() => setCount(n)} className={`text-[11px] ${count === n ? "bg-summit-navy text-white" : "bg-summit-paper text-summit-navy hover:bg-amber-100"} rounded-full px-2.5 py-1 font-bold transition-colors`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5 block">Not (opsiyonel)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Örn: 1 Mart ekibi"
                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
                data-testid="reserve-note-input"
              />
            </div>

            {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-2.5 text-xs flex items-start gap-1.5"><AlertCircle size={13} className="shrink-0 mt-0.5" />{err}</div>}

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 btn-outline-navy py-2 text-sm" data-testid="reserve-cancel-btn">İptal</button>
              <button onClick={submit} disabled={submitting} className="flex-1 btn-navy py-2 text-sm disabled:opacity-60" data-testid="reserve-submit-btn">
                {submitting ? "Oluşturuluyor..." : `${count || 0} Rezerve Et`}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3" data-testid="reserve-success">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
              <div className="font-bold text-green-800 mb-1">✓ Rezervasyon tamamlandı</div>
              <div className="text-green-700 text-xs leading-relaxed">
                <strong>{result.inserted}</strong> kişilik yer <strong>{result.code}</strong> ({result.label}) adına kilitlendi.
                {result.skipped > 0 && <span> {result.skipped} kayıt zaten mevcuttu.</span>}
              </div>
            </div>
            <div className="bg-summit-paper border border-summit-navy/10 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-gray-600">Yeni doluluk:</span><strong className="text-summit-navy tabular-nums">{result.total_summit_after} / 600</strong></div>
              <div className="flex justify-between"><span className="text-gray-600">Kalan kapasite:</span><strong className="text-summit-navy tabular-nums">{result.remaining_capacity}</strong></div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Listede "Rezerve" filtresini seçerek bu kayıtları görebilir, isim/telefon ekleyince otomatik aktif kayda dönüşür.
            </p>
            <button onClick={onDone} className="w-full btn-navy py-2 text-sm" data-testid="reserve-done-btn">Tamam</button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, testid }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">{label}</label>
      <input
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy transition-colors"
        data-testid={testid}
      />
    </div>
  );
}

function ReadOnlyField({ label, value, mono, highlight }) {
  if (!value) return null;
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">{label}</label>
      <div className={`text-summit-navy text-sm ${mono ? "font-mono font-bold inline-block bg-summit-paper px-2 py-0.5 rounded" : ""} ${highlight ? "text-green-700 font-semibold" : ""}`}>
        {value}
      </div>
    </div>
  );
}
