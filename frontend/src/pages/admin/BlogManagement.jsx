import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const empty = { title: "", slug: "", content: "", excerpt: "", image_url: "", author: "Admin", tags: [], is_published: false };

export default function BlogManagement() {
  const [posts, setPosts] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    const { data } = await axios.get(`${API}/admin/blog`, { withCredentials: true });
    setPosts(data);
  };

  const openCreate = () => { setEditing(null); setForm(empty); setTagsInput(""); setModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ title: p.title, slug: p.slug, content: p.content, excerpt: p.excerpt || "", image_url: p.image_url || "", author: p.author || "Admin", tags: p.tags || [], is_published: p.is_published });
    setTagsInput((p.tags || []).join(", "));
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) return;
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const payload = { ...form, tags };
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/blog/${editing.id}`, payload, { withCredentials: true });
        setMsg("Blog yazısı güncellendi.");
      } else {
        await axios.post(`${API}/admin/blog`, payload, { withCredentials: true });
        setMsg("Blog yazısı eklendi.");
      }
      setModal(false);
      fetchPosts();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setMsg(typeof detail === "string" ? detail : "Hata oluştu.");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    await axios.delete(`${API}/admin/blog/${id}`, { withCredentials: true });
    fetchPosts();
    setMsg("Blog yazısı silindi.");
  };

  const generateSlug = (title) => title.toLowerCase().replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ç/g,"c").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

  return (
    <div data-testid="blog-management-page">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-heading text-white text-2xl sm:text-3xl">Blog Yönetimi</h1>
          <p className="text-summit-text-muted text-sm mt-1">{posts.length} yazı</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm" data-testid="add-blog-btn">
          <Plus size={15} /> Yeni Yazı
        </button>
      </div>

      {msg && <div className="bg-summit-gold/10 border border-summit-gold/30 rounded-lg p-3 text-summit-gold text-sm mb-5 flex items-center justify-between">{msg}<button onClick={() => setMsg("")}><X size={14} /></button></div>}

      <div className="bg-summit-paper border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full admin-table">
            <thead>
              <tr>
                <th>Başlık</th>
                <th className="hidden sm:table-cell">Yazar</th>
                <th>Durum</th>
                <th className="hidden md:table-cell">Tarih</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-summit-text-muted">Henüz blog yazısı yok</td></tr>}
              {posts.map(p => (
                <tr key={p.id} data-testid={`blog-row-${p.id}`}>
                  <td>
                    <div className="text-white text-sm font-medium">{p.title}</div>
                    <div className="text-summit-text-muted text-xs mt-0.5">/{p.slug}</div>
                  </td>
                  <td className="hidden sm:table-cell text-summit-text-muted text-sm">{p.author}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.is_published ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                      {p.is_published ? "Yayında" : "Taslak"}
                    </span>
                  </td>
                  <td className="hidden md:table-cell text-summit-text-muted text-xs">{p.created_at?.slice(0,10)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-summit-gold/10 text-summit-gold hover:bg-summit-gold/20"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(p.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
          <div className="bg-summit-paper border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-white text-lg">{editing ? "Yazıyı Düzenle" : "Yeni Blog Yazısı"}</h3>
              <button onClick={() => setModal(false)}><X size={18} className="text-summit-text-muted hover:text-white" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Başlık *</label>
                <input type="text" placeholder="Yazı başlığı" value={form.title}
                  onChange={e => { const v = e.target.value; setForm({...form, title: v, slug: editing ? form.slug : generateSlug(v)}); }}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Slug *</label>
                <input type="text" placeholder="yazı-slug" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50 font-mono" />
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Özet</label>
                <textarea placeholder="Kısa özet..." rows={2} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50 resize-none" />
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">İçerik *</label>
                <textarea placeholder="Blog içeriği..." rows={8} value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50 resize-none" />
              </div>
              <div>
                <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Kapak Görseli URL</label>
                <input type="url" placeholder="https://..." value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})}
                  className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Yazar</label>
                  <input type="text" placeholder="Admin" value={form.author} onChange={e => setForm({...form, author: e.target.value})}
                    className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
                <div>
                  <label className="text-summit-text-muted text-xs uppercase tracking-wider mb-2 block">Etiketler (virgülle)</label>
                  <input type="text" placeholder="arsa, yatırım, imar" value={tagsInput} onChange={e => setTagsInput(e.target.value)}
                    className="w-full bg-summit-surface border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-summit-gold/50" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => setForm({...form, is_published: e.target.checked})} className="w-4 h-4 accent-summit-gold" />
                <span className="text-summit-text-secondary text-sm">Yayınla (hemen görünür olsun)</span>
              </label>
              <div className="flex gap-3 justify-end mt-2">
                <button onClick={() => setModal(false)} className="btn-outline-gold px-5 py-2.5 text-sm">İptal</button>
                <button onClick={handleSave} disabled={saving} className="btn-gold px-5 py-2.5 text-sm" data-testid="save-blog-btn">
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
