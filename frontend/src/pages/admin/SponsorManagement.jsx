import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const empty = { name: "", logo_url: "", website_url: "", tier: "standard", order: 0 };
const tiers = [["main","Ana Sponsor"], ["organization","Organizasyon Sponsoru"], ["standard","Standart Sponsor"]];

export default function SponsorManagement() {
  const [sponsors, setSponsors] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchSponsors(); }, []);

  const fetchSponsors = async () => {
    const { data } = await axios.get(`${API}/admin/sponsors`, { withCredentials: true });
    setSponsors(data);
  };

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, logo_url: s.logo_url || "", website_url: s.website_url || "", tier: s.tier, order: s.order });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/sponsors/${editing.id}`, form, { withCredentials: true });
        setMsg("Sponsor güncellendi.");
      } else {
        await axios.post(`${API}/admin/sponsors`, form, { withCredentials: true });
        setMsg("Sponsor eklendi.");
      }
      setModal(false);
      fetchSponsors();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/sponsors/${id}`, { withCredentials: true });
    fetchSponsors();
    setMsg("Sponsor silindi.");
  };

  const getTierLabel = (tier) => tiers.find(t => t[0] === tier)?.[1] || tier;

  return (
    <div data-testid="sponsor-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Sponsor Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{sponsors.length} sponsor</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-sponsor-btn">
          <Plus size={15} /> Yeni Sponsor
        </button>
      </div>

      {msg && <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">{msg}<button onClick={() => setMsg("")}><X size={14} /></button></div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full admin-table">
            <thead>
              <tr>
                <th>Sponsor Adı</th>
                <th>Tier</th>
                <th className="hidden sm:table-cell">Web Sitesi</th>
                <th>Sıra</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-500">Sponsor bulunamadı</td></tr>}
              {sponsors.map(s => (
                <tr key={s.id} data-testid={`sponsor-row-${s.id}`}>
                  <td className="text-summit-navy font-medium">{s.name}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.tier === "main" ? "bg-summit-gold/15 text-summit-gold" : s.tier === "organization" ? "bg-blue-500/15 text-blue-400" : "bg-white/5 text-gray-500"}`}>
                      {getTierLabel(s.tier)}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell text-gray-500 text-xs">{s.website_url || "-"}</td>
                  <td className="text-gray-500">{s.order}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-summit-gold/10 text-summit-gold hover:bg-summit-gold/20"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(s.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">{editing ? "Sponsor Düzenle" : "Yeni Sponsor"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-500 hover:text-summit-navy" /></button>
            </div>
            <div className="space-y-4">
              {[["name","Sponsor Adı *","text"], ["logo_url","Logo URL","url"], ["website_url","Web Sitesi URL","url"]].map(([field, label, type]) => (
                <div key={field}>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">{label}</label>
                  <input type={type} placeholder={label} value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              ))}
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Tier</label>
                <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50">
                  {tiers.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Sıra</label>
                <input type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)||0})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setModal(false)} className="btn-outline-gold px-5 py-2.5 text-sm">İptal</button>
                <button onClick={handleSave} disabled={saving} className="btn-gold px-5 py-2.5 text-sm" data-testid="save-sponsor-btn">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
