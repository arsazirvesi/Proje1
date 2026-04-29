import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const empty = { time_start: "", time_end: "", title: "", speaker_name: "", session_type: "talk", description: "", order: 0 };
const types = [["talk","Sunum"], ["panel","Panel"], ["break","Ara / Yemek"], ["networking","Networking"]];

const typeColors = { talk: "bg-summit-gold/15 text-summit-gold", panel: "bg-purple-500/15 text-purple-400", break: "bg-slate-500/15 text-slate-400", networking: "bg-green-500/15 text-green-400" };

export default function ProgramManagement() {
  const [sessions, setSessions] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    const { data } = await axios.get(`${API}/admin/program`, { withCredentials: true });
    setSessions(data);
  };

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ time_start: s.time_start, time_end: s.time_end, title: s.title, speaker_name: s.speaker_name || "", session_type: s.session_type, description: s.description || "", order: s.order });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.time_start) return;
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/program/${editing.id}`, form, { withCredentials: true });
        setMsg("Oturum güncellendi.");
      } else {
        await axios.post(`${API}/admin/program`, form, { withCredentials: true });
        setMsg("Oturum eklendi.");
      }
      setModal(false);
      fetchSessions();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/program/${id}`, { withCredentials: true });
    fetchSessions();
    setMsg("Oturum silindi.");
  };

  return (
    <div data-testid="program-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Program Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{sessions.length} oturum</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-session-btn">
          <Plus size={15} /> Yeni Oturum
        </button>
      </div>

      {msg && <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">{msg}<button onClick={() => setMsg("")}><X size={14} /></button></div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full admin-table">
            <thead>
              <tr>
                <th>Saat</th>
                <th>Oturum Başlığı</th>
                <th className="hidden sm:table-cell">Konuşmacı</th>
                <th>Tip</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-500">Oturum bulunamadı</td></tr>}
              {sessions.map(s => (
                <tr key={s.id} data-testid={`session-row-${s.id}`}>
                  <td className="font-mono text-xs text-summit-gold whitespace-nowrap">{s.time_start} - {s.time_end}</td>
                  <td className="text-summit-navy text-sm">{s.title}</td>
                  <td className="hidden sm:table-cell text-gray-500 text-sm">{s.speaker_name || "-"}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColors[s.session_type] || typeColors.talk}`}>
                      {types.find(t => t[0] === s.session_type)?.[1] || s.session_type}
                    </span>
                  </td>
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
          <div className="bg-summit-paper border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-summit-navy text-lg">{editing ? "Oturum Düzenle" : "Yeni Oturum"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-500 hover:text-summit-navy" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Başlangıç *</label>
                  <input type="time" value={form.time_start} onChange={e => setForm({...form, time_start: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Bitiş</label>
                  <input type="time" value={form.time_end} onChange={e => setForm({...form, time_end: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Oturum Başlığı *</label>
                <input type="text" placeholder="Oturum başlığı" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Konuşmacı</label>
                <input type="text" placeholder="Konuşmacı adı" value={form.speaker_name} onChange={e => setForm({...form, speaker_name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Oturum Tipi</label>
                <select value={form.session_type} onChange={e => setForm({...form, session_type: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50">
                  {types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Açıklama</label>
                <textarea placeholder="Oturum açıklaması..." rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50 resize-none" />
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Sıra</label>
                <input type="number" value={form.order} onChange={e => setForm({...form, order: parseInt(e.target.value)||0})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setModal(false)} className="btn-outline-gold px-5 py-2.5 text-sm">İptal</button>
                <button onClick={handleSave} disabled={saving} className="btn-gold px-5 py-2.5 text-sm" data-testid="save-session-btn">
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
