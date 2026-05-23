import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus, Pencil, Trash2, X, Loader2, GraduationCap, Folder,
  BookOpen, Globe, MapPin, Banknote, Eye, EyeOff, Search,
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";
import ImageUrlInput from "../../components/ImageUrlInput";

const TAB_CATS = "categories";
const TAB_COURSES = "courses";
const TAB_SEO = "seo";

export default function AcademyManagement() {
  const [tab, setTab] = useState(TAB_CATS);

  return (
    <div className="space-y-5" data-testid="admin-seminer">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl text-summit-navy font-bold flex items-center gap-2">
            <GraduationCap size={22} className="text-amber-500" />
            Arsa Yatırım Semineri
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Kategori, seminer ve SEO yönetimi · /seminer sayfasına otomatik yansır</p>
        </div>
        <a href="/seminer" target="_blank" rel="noreferrer"
          className="text-xs font-semibold text-summit-navy hover:underline inline-flex items-center gap-1">
          Sayfayı Görüntüle <Globe size={11} />
        </a>
      </header>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab(TAB_CATS)}
          className={`px-4 py-2 text-xs font-bold rounded-md inline-flex items-center gap-1.5 transition-colors ${tab === TAB_CATS ? "bg-summit-navy text-white" : "text-gray-600 hover:text-summit-navy"}`}
          data-testid="seminer-tab-categories"
        >
          <Folder size={13} /> Kategoriler
        </button>
        <button
          onClick={() => setTab(TAB_COURSES)}
          className={`px-4 py-2 text-xs font-bold rounded-md inline-flex items-center gap-1.5 transition-colors ${tab === TAB_COURSES ? "bg-summit-navy text-white" : "text-gray-600 hover:text-summit-navy"}`}
          data-testid="seminer-tab-courses"
        >
          <BookOpen size={13} /> Seminerler
        </button>
        <button
          onClick={() => setTab(TAB_SEO)}
          className={`px-4 py-2 text-xs font-bold rounded-md inline-flex items-center gap-1.5 transition-colors ${tab === TAB_SEO ? "bg-summit-navy text-white" : "text-gray-600 hover:text-summit-navy"}`}
          data-testid="seminer-tab-seo"
        >
          <Search size={13} /> SEO & İçerik
        </button>
      </div>

      {tab === TAB_CATS && <CategoriesTab />}
      {tab === TAB_COURSES && <CoursesTab />}
      {tab === TAB_SEO && <SeoTab />}
    </div>
  );
}

// ====================== CATEGORIES TAB ======================
const EMPTY_CAT = { name: "", description: "", icon: "GraduationCap", image_url: "", order: 0, is_active: true };

function CategoriesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} | row
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/academy/categories`, { withCredentials: true });
      setItems(data);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Yüklenemedi");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    try {
      if (form.id) {
        await axios.patch(`${API}/admin/academy/categories/${form.id}`, form, { withCredentials: true });
      } else {
        await axios.post(`${API}/admin/academy/categories`, form, { withCredentials: true });
      }
      setEditing(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Kaydedilemedi");
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/admin/academy/categories/${id}`, { withCredentials: true });
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Silinemedi");
    }
  };

  if (loading) return <Loader />;
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditing({ ...EMPTY_CAT })}
          className="btn-navy text-xs px-3 py-2 inline-flex items-center gap-1.5" data-testid="add-category-btn">
          <Plus size={13} /> Yeni Kategori
        </button>
      </div>
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs mb-2">{err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="categories-grid">
        {items.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition-colors" data-testid={`category-${c.slug}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  {!c.is_active && <EyeOff size={11} className="text-gray-400" />}
                  <h3 className="font-bold text-summit-navy text-sm truncate">{c.name}</h3>
                </div>
                <div className="text-[10px] text-gray-400 truncate">/akademi/{c.slug}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(c)} className="p-1.5 text-gray-500 hover:text-summit-navy rounded hover:bg-gray-100"><Pencil size={12} /></button>
                <button onClick={() => remove(c.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50"><Trash2 size={12} /></button>
              </div>
            </div>
            {c.description && <p className="text-xs text-gray-600 line-clamp-2">{c.description}</p>}
            <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-2">
              <span>Icon: {c.icon}</span>
              <span>•</span>
              <span>Sıra: {c.order}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full text-center text-gray-400 text-sm py-12">Henüz kategori yok</div>}
      </div>

      {editing && <CategoryModal initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function CategoryModal({ initial, onClose, onSave }) {
  const [f, setF] = useState({ ...EMPTY_CAT, ...initial });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...f, order: Number(f.order) || 0 });
    setSaving(false);
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-heading text-summit-navy font-bold">{f.id ? "Kategori Düzenle" : "Yeni Kategori"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3.5">
          <Field label="Kategori Adı">
            <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required className="form-input" data-testid="cat-name-input" />
          </Field>
          <Field label="Açıklama">
            <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={2} className="form-input resize-none" />
          </Field>
          <Field label="Görsel (opsiyonel)">
            <ImageUrlInput value={f.image_url} onChange={url => setF({ ...f, image_url: url })} testIdPrefix="cat-img" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lucide Icon (örn. Map, Scale, TrendingUp)">
              <input value={f.icon} onChange={e => setF({ ...f, icon: e.target.value })} className="form-input" />
            </Field>
            <Field label="Sıralama">
              <input type="number" value={f.order} onChange={e => setF({ ...f, order: e.target.value })} className="form-input" />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-summit-navy cursor-pointer">
            <input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} className="accent-amber-500" />
            <span>Aktif (sitede görünsün)</span>
          </label>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-summit-navy">İptal</button>
          <button type="submit" disabled={saving} className="btn-navy px-4 py-2 text-xs inline-flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}

// ====================== COURSES TAB ======================
const EMPTY_COURSE = {
  category_id: "", title: "", description: "", cover_image_url: "",
  format: "hybrid", is_free: true, price_try: 0,
  duration_hours: "", instructor_names: [], start_date: "", end_date: "",
  location: "", capacity: "",
  seo_title: "", seo_description: "", seo_keywords: "",
  is_published: true, order: 0,
};

function CoursesTab() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: courses }, { data: categories }] = await Promise.all([
        axios.get(`${API}/admin/academy/courses`, { withCredentials: true }),
        axios.get(`${API}/admin/academy/categories`, { withCredentials: true }),
      ]);
      setItems(courses); setCats(categories);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Yüklenemedi");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    try {
      const payload = {
        ...form,
        order: Number(form.order) || 0,
        price_try: Number(form.price_try) || 0,
        duration_hours: form.duration_hours === "" ? null : Number(form.duration_hours),
        capacity: form.capacity === "" ? null : Number(form.capacity),
        instructor_names: Array.isArray(form.instructor_names) ? form.instructor_names : String(form.instructor_names || "").split(",").map(s => s.trim()).filter(Boolean),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      delete payload.id;
      delete payload.slug;
      delete payload.created_at;
      delete payload.updated_at;
      if (form.id) {
        await axios.patch(`${API}/admin/academy/courses/${form.id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/admin/academy/courses`, payload, { withCredentials: true });
      }
      setEditing(null);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Kaydedilemedi");
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Bu eğitimi silmek istediğinize emin misiniz?")) return;
    try {
      await axios.delete(`${API}/admin/academy/courses/${id}`, { withCredentials: true });
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Silinemedi");
    }
  };

  const catName = (id) => cats.find(c => c.id === id)?.name || "—";
  if (loading) return <Loader />;
  return (
    <div>
      <div className="flex justify-between items-center mb-3 gap-3">
        <div className="text-xs text-gray-500">{items.length} eğitim · {cats.length} kategori</div>
        <button onClick={() => setEditing({ ...EMPTY_COURSE })}
          disabled={cats.length === 0}
          className="btn-navy text-xs px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-50" data-testid="add-course-btn">
          <Plus size={13} /> Yeni Eğitim
        </button>
      </div>
      {cats.length === 0 && <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded text-xs mb-2">Önce en az bir kategori ekleyin.</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs mb-2">{err}</div>}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm" data-testid="courses-table">
          <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2.5 font-bold">Eğitim</th>
              <th className="text-left px-3 py-2.5 font-bold">Kategori</th>
              <th className="text-left px-3 py-2.5 font-bold">Format</th>
              <th className="text-left px-3 py-2.5 font-bold">Fiyat</th>
              <th className="text-left px-3 py-2.5 font-bold">Durum</th>
              <th className="text-right px-3 py-2.5 font-bold">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50" data-testid={`course-row-${c.slug}`}>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-summit-navy text-sm">{c.title}</div>
                  <div className="text-[10px] text-gray-400">/akademi/egitim/{c.slug}</div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600">{catName(c.category_id)}</td>
                <td className="px-3 py-2.5 text-xs">
                  <FormatBadge format={c.format} />
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {c.is_free ? <span className="text-green-600 font-bold">Ücretsiz</span> : <span className="text-summit-navy font-bold">₺{Number(c.price_try).toLocaleString("tr-TR")}</span>}
                </td>
                <td className="px-3 py-2.5">
                  {c.is_published
                    ? <span className="text-[10px] uppercase font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1"><Eye size={9} /> Yayında</span>
                    : <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1"><EyeOff size={9} /> Taslak</span>
                  }
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => setEditing(c)} className="p-1.5 text-gray-500 hover:text-summit-navy rounded hover:bg-gray-100"><Pencil size={12} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-gray-400 text-sm">Henüz eğitim yok</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && <CourseModal initial={editing} cats={cats} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function CourseModal({ initial, cats, onClose, onSave }) {
  const [f, setF] = useState({
    ...EMPTY_COURSE,
    ...initial,
    instructor_names: Array.isArray(initial.instructor_names) ? initial.instructor_names.join(", ") : (initial.instructor_names || ""),
  });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.category_id) return alert("Kategori seçin");
    setSaving(true);
    await onSave(f);
    setSaving(false);
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-8">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-heading text-summit-navy font-bold">{f.id ? "Eğitim Düzenle" : "Yeni Eğitim"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori">
              <select value={f.category_id} onChange={e => setF({ ...f, category_id: e.target.value })} required className="form-input" data-testid="course-category-select">
                <option value="">— Seç —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Format">
              <select value={f.format} onChange={e => setF({ ...f, format: e.target.value })} className="form-input">
                <option value="online">🌐 Online</option>
                <option value="onsite">📍 Yüz Yüze</option>
                <option value="hybrid">🔁 Hibrit</option>
              </select>
            </Field>
          </div>
          <Field label="Eğitim Başlığı">
            <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required className="form-input" data-testid="course-title-input" />
          </Field>
          <Field label="Açıklama">
            <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={3} className="form-input resize-none" />
          </Field>
          <Field label="Kapak Görseli">
            <ImageUrlInput value={f.cover_image_url} onChange={url => setF({ ...f, cover_image_url: url })} testIdPrefix="course-cover" />
          </Field>
          <Field label="Eğitmenler (virgülle ayır)">
            <input value={f.instructor_names} onChange={e => setF({ ...f, instructor_names: e.target.value })} placeholder="Muhammet Özdemir, Büşra Kiraz" className="form-input" />
          </Field>

          {/* Fee */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-summit-navy cursor-pointer">
              <input type="checkbox" checked={f.is_free} onChange={e => setF({ ...f, is_free: e.target.checked, price_try: e.target.checked ? 0 : f.price_try })} className="accent-amber-500" />
              <Banknote size={14} /> Ücretsiz Eğitim
            </label>
            {!f.is_free && (
              <Field label="Fiyat (TL)">
                <input type="number" min="0" step="1" value={f.price_try} onChange={e => setF({ ...f, price_try: e.target.value })} className="form-input" />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Başlangıç Tarihi (opsiyonel)">
              <input type="date" value={f.start_date?.slice(0, 10) || ""} onChange={e => setF({ ...f, start_date: e.target.value })} className="form-input" />
            </Field>
            <Field label="Bitiş Tarihi (opsiyonel)">
              <input type="date" value={f.end_date?.slice(0, 10) || ""} onChange={e => setF({ ...f, end_date: e.target.value })} className="form-input" />
            </Field>
            <Field label="Süre (saat)">
              <input type="number" min="0" value={f.duration_hours} onChange={e => setF({ ...f, duration_hours: e.target.value })} className="form-input" />
            </Field>
            <Field label="Kontenjan">
              <input type="number" min="0" value={f.capacity} onChange={e => setF({ ...f, capacity: e.target.value })} className="form-input" />
            </Field>
            <Field label={<span className="inline-flex items-center gap-1"><MapPin size={11} /> Konum</span>}>
              <input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} className="form-input" placeholder="İstanbul / Online" />
            </Field>
            <Field label="Sıralama">
              <input type="number" value={f.order} onChange={e => setF({ ...f, order: e.target.value })} className="form-input" />
            </Field>
          </div>

          {/* SEO */}
          <details className="bg-gray-50 border border-gray-200 rounded-lg">
            <summary className="px-3 py-2 text-xs font-bold text-summit-navy cursor-pointer">🔍 SEO Ayarları (opsiyonel — boş bırakılırsa otomatik üretilir)</summary>
            <div className="p-3 space-y-2.5 border-t border-gray-200">
              <Field label="SEO Title">
                <input value={f.seo_title} onChange={e => setF({ ...f, seo_title: e.target.value })} maxLength={70} className="form-input" />
              </Field>
              <Field label="SEO Description (max 160 karakter)">
                <textarea value={f.seo_description} onChange={e => setF({ ...f, seo_description: e.target.value })} maxLength={160} rows={2} className="form-input resize-none" />
              </Field>
              <Field label="SEO Keywords (virgülle ayır)">
                <input value={f.seo_keywords} onChange={e => setF({ ...f, seo_keywords: e.target.value })} className="form-input" />
              </Field>
            </div>
          </details>

          <label className="inline-flex items-center gap-2 text-sm text-summit-navy cursor-pointer">
            <input type="checkbox" checked={f.is_published} onChange={e => setF({ ...f, is_published: e.target.checked })} className="accent-amber-500" />
            <span>Yayında (sitede görünsün)</span>
          </label>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-summit-navy">İptal</button>
          <button type="submit" disabled={saving} className="btn-navy px-4 py-2 text-xs inline-flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}

// ====================== SEO & CONTENT TAB ======================
function SeoTab() {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    axios.get(`${API}/seminar/settings`).then(r => setF(r.data));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const { data } = await axios.patch(`${API}/admin/seminar/settings`, f, { withCredentials: true });
      setF(data);
      setMsg("✅ Kaydedildi — /seminer sayfası güncellendi");
      setTimeout(() => setMsg(""), 4000);
    } catch (e2) {
      setMsg(e2?.response?.data?.detail || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  if (!f) return <Loader />;

  return (
    <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-3xl" data-testid="seo-form">
      {/* HERO */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-summit-navy uppercase tracking-wider border-b border-gray-100 pb-2">Hero Bölümü</h3>
        <Field label="Üst Rozet (Overline)">
          <input value={f.hero_overline || ""} onChange={e => setF({ ...f, hero_overline: e.target.value })} className="form-input" data-testid="seo-hero-overline" placeholder="Saha Uzmanlarından" />
        </Field>
        <Field label="Ana Başlık (H1)">
          <input value={f.hero_title || ""} onChange={e => setF({ ...f, hero_title: e.target.value })} className="form-input" data-testid="seo-hero-title" placeholder="Arsa Yatırım Semineri" />
        </Field>
        <Field label="Başlığın Vurgulu Kısmı (altın renk)">
          <input value={f.hero_accent || ""} onChange={e => setF({ ...f, hero_accent: e.target.value })} className="form-input" placeholder="Semineri" />
          <p className="text-[10px] text-gray-400 mt-1">Başlık metninin sonunda eşleşen kelime altın renge boyanır. Örn: başlık "Arsa Yatırım Semineri", vurgu "Semineri" → "Arsa Yatırım <span class='text-amber-500 font-bold'>Semineri</span>"</p>
        </Field>
        <Field label="Alt Başlık (H2 / Açıklama)">
          <textarea value={f.hero_subtitle || ""} onChange={e => setF({ ...f, hero_subtitle: e.target.value })} rows={3} className="form-input resize-none" data-testid="seo-hero-subtitle" />
        </Field>
      </section>

      {/* SEO */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-summit-navy uppercase tracking-wider border-b border-gray-100 pb-2 pt-4 flex items-center gap-1.5">
          <Search size={12} /> SEO Meta Etiketleri
        </h3>
        <Field label="SEO Title (60-70 karakter ideal)">
          <input value={f.seo_title || ""} onChange={e => setF({ ...f, seo_title: e.target.value })} maxLength={120} className="form-input" data-testid="seo-meta-title" />
          <div className="text-[10px] text-gray-400 mt-1">{(f.seo_title || "").length}/120</div>
        </Field>
        <Field label="SEO Description (150-160 karakter ideal)">
          <textarea value={f.seo_description || ""} onChange={e => setF({ ...f, seo_description: e.target.value })} maxLength={300} rows={3} className="form-input resize-none" data-testid="seo-meta-description" />
          <div className="text-[10px] text-gray-400 mt-1">{(f.seo_description || "").length}/300</div>
        </Field>
        <Field label="Anahtar Kelimeler (virgülle ayır)">
          <textarea value={f.seo_keywords || ""} onChange={e => setF({ ...f, seo_keywords: e.target.value })} rows={3} className="form-input resize-none" data-testid="seo-meta-keywords"
            placeholder="arsa yatırım semineri, arsa eğitimi, gayrimenkul semineri..." />
        </Field>
        <Field label="Canonical URL Yolu">
          <input value={f.canonical_path || ""} onChange={e => setF({ ...f, canonical_path: e.target.value })} className="form-input" placeholder="/seminer" />
        </Field>
      </section>

      {/* OG */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-summit-navy uppercase tracking-wider border-b border-gray-100 pb-2 pt-4">Sosyal Medya Önizleme (Open Graph)</h3>
        <Field label="OG Title (opsiyonel — boşsa SEO title kullanılır)">
          <input value={f.og_title || ""} onChange={e => setF({ ...f, og_title: e.target.value })} className="form-input" />
        </Field>
        <Field label="OG Description (opsiyonel — boşsa SEO description kullanılır)">
          <textarea value={f.og_description || ""} onChange={e => setF({ ...f, og_description: e.target.value })} rows={2} className="form-input resize-none" />
        </Field>
        <Field label="OG Image (1200×630px önerilir)">
          <ImageUrlInput value={f.og_image} onChange={url => setF({ ...f, og_image: url })} testIdPrefix="seo-og" />
        </Field>
      </section>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {msg && <div className="text-xs font-semibold text-summit-navy">{msg}</div>}
        <button type="submit" disabled={saving} className="btn-navy px-5 py-2.5 text-xs inline-flex items-center gap-1.5 ml-auto" data-testid="seo-save-btn">
          {saving && <Loader2 size={12} className="animate-spin" />} Kaydet
        </button>
      </div>
    </form>
  );
}

// ====================== HELPERS ======================
function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{label}</label>
      {children}
    </div>
  );
}
function FormatBadge({ format }) {
  const map = {
    online: { l: "Online", c: "bg-blue-50 border-blue-200 text-blue-700" },
    onsite: { l: "Yüz Yüze", c: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    hybrid: { l: "Hibrit", c: "bg-purple-50 border-purple-200 text-purple-700" },
  };
  const m = map[format] || map.hybrid;
  return <span className={`text-[10px] uppercase font-bold border rounded px-1.5 py-0.5 ${m.c}`}>{m.l}</span>;
}
function Loader() {
  return <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-summit-navy" /></div>;
}
