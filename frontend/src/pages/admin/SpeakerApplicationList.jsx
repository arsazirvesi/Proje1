import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Trash2, Search, Download, Send, X, Eye, Filter } from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import { exportXLSX } from "../../lib/xlsx";

const STATUS_OPTIONS = [
  { value: "all", label: "Tümü", cls: "" },
  { value: "new", label: "Yeni", cls: "status-new" },
  { value: "contacted", label: "İletişim Kuruldu", cls: "status-contacted" },
  { value: "approved", label: "Onaylandı", cls: "status-approved" },
  { value: "rejected", label: "Reddedildi", cls: "status-rejected" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Tüm Başvurular" },
  { value: "konusmaci", label: "Konuşmacı" },
  { value: "panelist", label: "Panelist" },
  { value: "sponsor", label: "Sponsor" },
];

function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[1];
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>;
}

function TypeBadge({ t }) {
  const colors = {
    konusmaci: "bg-blue-100 text-blue-700",
    panelist: "bg-purple-100 text-purple-700",
    sponsor: "bg-amber-100 text-amber-700",
  };
  const labels = { konusmaci: "Konuşmacı", panelist: "Panelist", sponsor: "Sponsor" };
  return <span className={`status-badge ${colors[t] || "bg-gray-100 text-gray-700"}`}>{labels[t] || t}</span>;
}

export default function SpeakerApplicationList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", content: "" });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.application_type = typeFilter;
      if (search) params.q = search;
      const { data } = await axios.get(`${API}/admin/speaker-applications`, { params, withCredentials: true });
      setItems(data);
    } catch {}
    setLoading(false);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 250);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu başvuruyu silmek istediğinizden emin misiniz?")) return;
    try {
      await axios.delete(`${API}/admin/speaker-applications/${id}`, { withCredentials: true });
      setItems(g => g.filter(x => x.id !== id));
      setMsg("Başvuru silindi.");
    } catch {}
  };

  const handleUpdate = async (id, status, admin_notes) => {
    try {
      await axios.patch(`${API}/admin/speaker-applications/${id}`, { status, admin_notes }, { withCredentials: true });
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
        { ...emailForm, recipient_type: "speaker_applications" },
        { withCredentials: true }
      );
      setMsg(data.message);
      setEmailModal(false);
      setEmailForm({ subject: "", content: "" });
    } catch { setMsg("Email gönderilemedi."); }
    setSending(false);
  };

  const exportCSV = () => {
    const rows = [["Sıra", "Tip", "Ad/Firma", "Email", "Telefon", "Şirket", "Uzmanlık", "Konu", "Sponsor Paketi", "Durum", "Tarih"]];
    items.forEach((g, i) => rows.push([
      i + 1, g.application_type, g.name, g.email, g.phone, g.company || "", g.expertise || "",
      g.topic || "", g.sponsor_package || "", g.status || "new", g.created_at?.slice(0,10)
    ]));
    exportXLSX(rows, "konusmaci-sponsor-basvurulari", "Başvurular");
  };

  const counts = STATUS_OPTIONS.reduce((acc, o) => {
    acc[o.value] = o.value === "all" ? items.length : items.filter(i => (i.status || "new") === o.value).length;
    return acc;
  }, {});

  return (
    <div data-testid="speaker-app-list-page">
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Konuşmacı / Sponsor Başvuruları</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} başvuru · Konuşmacı, panelist ve sponsor başvuruları</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700 text-sm hover:border-summit-navy/30">
            <Download size={14} /> Excel İndir
          </button>
          <button onClick={() => setEmailModal(true)} className="btn-navy flex items-center gap-2 px-4 py-2 text-sm">
            <Send size={14} /> Toplu Email
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-summit-navy/5 border border-summit-navy/30 rounded-md p-3 text-summit-navy text-sm mb-5 flex items-center justify-between">
          {msg}
          <button onClick={() => setMsg("")}><X size={14} /></button>
        </div>
      )}

      {/* Type filter */}
      <div className="bg-white border border-gray-200 rounded-md p-3 mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-semibold ml-1 mr-2">BAŞVURU TİPİ:</span>
        {TYPE_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setTypeFilter(o.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              typeFilter === o.value ? "bg-summit-navy text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
            data-testid={`filter-type-${o.value}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="bg-white border border-gray-200 rounded-md p-3 mb-4 flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-gray-400 ml-1" />
        {STATUS_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setStatusFilter(o.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              statusFilter === o.value ? "bg-summit-navy text-white" : "text-gray-600 hover:bg-gray-100"
            }`}>
            {o.label} <span className="opacity-70">({counts[o.value] || 0})</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input placeholder="Ad, email, şirket, uzmanlık ara..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-md pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none max-w-md"
              data-testid="sp-search-input" />
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
                  <th>Tip</th>
                  <th>Ad / Firma</th>
                  <th>E-posta</th>
                  <th className="hidden md:table-cell">Telefon</th>
                  <th className="hidden lg:table-cell">Uzmanlık</th>
                  <th>Durum</th>
                  <th className="hidden sm:table-cell">Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-500">Başvuru bulunamadı</td></tr>
                )}
                {items.map((g, i) => (
                  <tr key={g.id} data-testid={`sp-row-${g.id}`}>
                    <td className="text-center text-gray-400 font-mono text-xs font-semibold">#{i + 1}</td>
                    <td><TypeBadge t={g.application_type} /></td>
                    <td className="text-summit-navy font-medium">{g.name}</td>
                    <td className="text-gray-600">{g.email}</td>
                    <td className="hidden md:table-cell">{g.phone}</td>
                    <td className="hidden lg:table-cell">{g.expertise || g.sponsor_package || "-"}</td>
                    <td><StatusBadge status={g.status || "new"} /></td>
                    <td className="hidden sm:table-cell">{g.created_at?.slice(0,10)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDetail(g)} className="w-7 h-7 flex items-center justify-center rounded bg-summit-navy/10 text-summit-navy hover:bg-summit-navy/20 transition-colors" title="Detay" data-testid={`view-sp-${g.id}`}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleDelete(g.id)} className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors" data-testid={`delete-sp-${g.id}`}>
                          <Trash2 size={13} />
                        </button>
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
        <div className="fixed inset-0 z-50 flex" data-testid="sp-detail-drawer">
          <div className="absolute inset-0 bg-summit-navy/40" onClick={() => setDetail(null)} />
          <div className="relative ml-auto h-full w-full max-w-xl bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="font-heading text-summit-navy text-xl">Başvuru Detayı</h3>
                <div className="mt-1"><TypeBadge t={detail.application_type} /></div>
              </div>
              <button onClick={() => setDetail(null)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              {[
                ["Ad / Firma", detail.name],
                ["E-posta", detail.email],
                ["Telefon", detail.phone],
                ["Şirket / Sektör", detail.company],
                ["Uzmanlık Alanı", detail.expertise],
                ["Konu Başlığı", detail.topic],
                ["Kısa Bio / CV", detail.bio],
                ["Sponsor Paketi", detail.sponsor_package],
                ["LinkedIn", detail.linkedin],
                ["Web Sitesi", detail.website],
                ["Ek Notlar", detail.additional_notes],
                ["Başvuru Tarihi", detail.created_at?.slice(0,16).replace("T", " ")],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{k}</div>
                  <div className="text-summit-navy text-sm whitespace-pre-wrap">{v}</div>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Durum</label>
                <select value={detail.status || "new"}
                  onChange={(e) => handleUpdate(detail.id, e.target.value, detail.admin_notes || "")}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none">
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
                  placeholder="Notlarınız..." />
                <button onClick={() => handleUpdate(detail.id, detail.status || "new", detail.admin_notes || "")}
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
              <h3 className="font-heading text-summit-navy text-lg">Başvuru Sahiplerine Email</h3>
              <button onClick={() => setEmailModal(false)}><X size={18} className="text-gray-500" /></button>
            </div>
            <p className="text-gray-500 text-xs mb-5">{items.length} kişiye email gönderilecektir.</p>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">Konu</label>
                <input type="text" value={emailForm.subject}
                  onChange={e => setEmailForm({...emailForm, subject: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">İçerik (HTML)</label>
                <textarea rows={6} value={emailForm.content}
                  onChange={e => setEmailForm({...emailForm, content: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEmailModal(false)} className="btn-outline-navy px-5 py-2.5">İptal</button>
                <button onClick={handleSendBulk} disabled={sending} className="btn-navy px-5 py-2.5 flex items-center gap-2">
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
