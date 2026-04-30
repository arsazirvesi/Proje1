import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Mail, Search, Download, Send, X } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

export default function MemberList() {
  const [members, setMembers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", content: "" });
  const [sending, setSending] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(members.filter(m =>
      m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.company?.toLowerCase().includes(q)
    ));
  }, [search, members]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/members`, { withCredentials: true });
      setMembers(data);
      setFiltered(data);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu üyeyi silmek istediğinizden emin misiniz?")) return;
    try {
      await axios.delete(`${API}/admin/members/${id}`, { withCredentials: true });
      setMembers(m => m.filter(x => x.id !== id));
      setMsg("Üye silindi.");
    } catch {}
  };

  const handleSendBulk = async () => {
    if (!emailForm.subject || !emailForm.content) return;
    setSending(true);
    try {
      const { data } = await axios.post(`${API}/admin/email/send`,
        { ...emailForm, recipient_type: "members" },
        { withCredentials: true }
      );
      setMsg(data.message);
      setEmailModal(false);
      setEmailForm({ subject: "", content: "" });
    } catch (err) {
      setMsg("Email gönderilemedi.");
    }
    setSending(false);
  };

  const exportCSV = () => {
    const rows = [["Sıra", "Ad", "Email", "Telefon", "Şirket", "Unvan", "Şehir", "Tarih"]];
    filtered.forEach((m, i) => rows.push([i + 1, m.name, m.email, m.phone || "", m.company || "", m.title || "", m.city || "", m.created_at?.slice(0,10)]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "uyeler.csv"; a.click();
  };

  return (
    <div data-testid="member-list-page">
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Üye Listesi</h1>
          <p className="text-gray-500 text-sm mt-1">{members.length} kayıtlı üye</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm hover:border-summit-gold/30 transition-colors">
            <Download size={14} /> Excel İndir
          </button>
          <button onClick={() => setEmailModal(true)} className="btn-gold flex items-center gap-2 px-4 py-2 text-sm" data-testid="send-bulk-email-btn">
            <Send size={14} /> Toplu Email Gönder
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">
          {msg}
          <button onClick={() => setMsg("")}><X size={14} /></button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              placeholder="İsim, email veya şirket ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-summit-navy text-sm placeholder-gray-400 focus:outline-none focus:border-summit-gold/50 max-w-sm"
              data-testid="member-search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-summit-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th>Ad Soyad</th>
                  <th>E-posta</th>
                  <th className="hidden md:table-cell">Telefon</th>
                  <th className="hidden lg:table-cell">Şirket</th>
                  <th className="hidden lg:table-cell">Şehir</th>
                  <th className="hidden sm:table-cell">Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-500">Üye bulunamadı</td></tr>
                )}
                {filtered.map((m, i) => (
                  <tr key={m.id} data-testid={`member-row-${m.id}`}>
                    <td className="text-center text-gray-400 font-mono text-xs font-semibold">#{i + 1}</td>
                    <td className="text-summit-navy font-medium">{m.name}</td>
                    <td className="text-gray-600">{m.email}</td>
                    <td className="hidden md:table-cell">{m.phone || "-"}</td>
                    <td className="hidden lg:table-cell">{m.company || "-"}</td>
                    <td className="hidden lg:table-cell">{m.city || "-"}</td>
                    <td className="hidden sm:table-cell">{m.created_at?.slice(0,10)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          data-testid={`delete-member-${m.id}`}
                        >
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

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">Toplu Email Gönder</h3>
              <button onClick={() => setEmailModal(false)}><X size={18} className="text-gray-500 hover:text-summit-navy" /></button>
            </div>
            <p className="text-gray-500 text-xs mb-5">{members.length} üyeye email gönderilecektir.</p>
            <div className="space-y-4">
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Konu</label>
                <input
                  type="text"
                  placeholder="Email konusu"
                  value={emailForm.subject}
                  onChange={e => setEmailForm({...emailForm, subject: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50"
                  data-testid="email-subject-input"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">İçerik (HTML)</label>
                <textarea
                  placeholder="Email içeriği..."
                  rows={6}
                  value={emailForm.content}
                  onChange={e => setEmailForm({...emailForm, content: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50 resize-none"
                  data-testid="email-content-input"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEmailModal(false)} className="btn-outline-gold px-5 py-2.5 text-sm">İptal</button>
                <button onClick={handleSendBulk} disabled={sending} className="btn-gold px-5 py-2.5 text-sm flex items-center gap-2" data-testid="confirm-send-email-btn">
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
