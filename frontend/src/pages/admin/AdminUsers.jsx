import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { Trash2, Plus, Lock, X, UserCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [pwModal, setPwModal] = useState(null); // user object
  const [newPw, setNewPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/users`, { withCredentials: true });
      setUsers(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr("");
    if (createForm.password.length < 8) {
      setErr("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/admin/users`, createForm, { withCredentials: true });
      setMsg(`${createForm.email} adresli admin oluşturuldu.`);
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "" });
      fetchUsers();
    } catch (e) {
      setErr(e.response?.data?.detail || "Bir hata oluştu");
    }
    setSubmitting(false);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`${u.email} adminini silmek istediğinizden emin misiniz?`)) return;
    try {
      await axios.delete(`${API}/admin/users/${u.id}`, { withCredentials: true });
      setMsg("Admin silindi");
      fetchUsers();
    } catch (e) {
      setMsg(e.response?.data?.detail || "Silme başarısız");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErr("");
    if (newPw.length < 8) {
      setErr("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.patch(`${API}/admin/users/${pwModal.id}/password`,
        { new_password: newPw },
        { withCredentials: true });
      setMsg(`${pwModal.email} şifresi güncellendi.`);
      setPwModal(null);
      setNewPw("");
    } catch (e) {
      setErr(e.response?.data?.detail || "Şifre güncellenemedi");
    }
    setSubmitting(false);
  };

  return (
    <div data-testid="admin-users-page">
      <div className="flex items-start justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Yönetici Hesapları</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} admin · Sisteme giriş yapabilen hesaplar</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-navy flex items-center gap-2 px-5 py-2.5 text-sm" data-testid="create-admin-btn">
          <Plus size={15} /> Yeni Admin Ekle
        </button>
      </div>

      {msg && (
        <div className="bg-summit-navy/5 border border-summit-navy/30 rounded-md p-3 text-summit-navy text-sm mb-5 flex items-center justify-between">
          {msg}
          <button onClick={() => setMsg("")}><X size={14} /></button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-summit-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr>
                  <th>İsim</th>
                  <th>E-posta</th>
                  <th className="hidden md:table-cell">Rol</th>
                  <th className="hidden lg:table-cell">Oluşturulma</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-500">Admin bulunamadı</td></tr>
                )}
                {users.map(u => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-summit-navy/10 flex items-center justify-center text-summit-navy text-xs font-bold">
                          {u.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div>
                          <div className="text-summit-navy font-medium">{u.name}</div>
                          {u.id === currentUser?._id && (
                            <span className="text-[0.6rem] text-summit-accent uppercase font-bold tracking-wider">Siz</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-600">{u.email}</td>
                    <td className="hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-summit-navy">
                        <ShieldCheck size={13} /> Admin
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-gray-500 text-xs">
                      {u.created_at?.slice(0, 10)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setPwModal(u); setNewPw(""); setErr(""); }}
                          className="w-7 h-7 flex items-center justify-center rounded bg-summit-navy/10 text-summit-navy hover:bg-summit-navy/20 transition-colors"
                          title="Şifre Değiştir"
                          data-testid={`change-pw-${u.id}`}
                        ><Lock size={13} /></button>
                        {u.id !== currentUser?._id && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            data-testid={`delete-user-${u.id}`}
                          ><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-white border border-gray-200 rounded-md p-6 w-full max-w-md shadow-xl" data-testid="create-admin-modal">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-heading text-summit-navy text-lg flex items-center gap-2">
                  <UserCircle size={18} /> Yeni Admin Oluştur
                </h3>
                <p className="text-gray-500 text-xs mt-1">Yeni admin sisteme giriş yapabilecek</p>
              </div>
              <button onClick={() => { setShowCreate(false); setErr(""); }}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">Ad Soyad</label>
                <input type="text" required placeholder="Ad Soyad" value={createForm.name}
                  onChange={e => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                  data-testid="new-admin-name" />
              </div>
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">E-posta</label>
                <input type="email" required placeholder="ornek@arsayatirim.com" value={createForm.email}
                  onChange={e => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-summit-navy text-sm focus:outline-none"
                  data-testid="new-admin-email" />
              </div>
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">Şifre</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder="En az 8 karakter" value={createForm.password}
                    onChange={e => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-md px-4 pr-10 py-2.5 text-summit-navy text-sm focus:outline-none"
                    data-testid="new-admin-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-summit-navy">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">En az 8 karakter olmalı</p>
              </div>
              {err && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2.5 text-red-600 text-xs">
                  {err}
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setErr(""); }} className="btn-outline-navy px-5 py-2.5">İptal</button>
                <button type="submit" disabled={submitting} className="btn-navy px-5 py-2.5 flex items-center gap-2" data-testid="confirm-create-admin">
                  <Plus size={14} /> {submitting ? "Oluşturuluyor..." : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="bg-white border border-gray-200 rounded-md p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-heading text-summit-navy text-lg flex items-center gap-2">
                  <Lock size={18} /> Şifre Değiştir
                </h3>
                <p className="text-gray-500 text-xs mt-1">{pwModal.email}</p>
              </div>
              <button onClick={() => { setPwModal(null); setErr(""); }}><X size={18} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-gray-600 text-xs uppercase tracking-wider mb-2 block font-semibold">Yeni Şifre</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder="En az 8 karakter" value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-md px-4 pr-10 py-2.5 text-summit-navy text-sm focus:outline-none"
                    data-testid="change-pw-input" autoFocus />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-summit-navy">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {err && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2.5 text-red-600 text-xs">{err}</div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setPwModal(null); setErr(""); }} className="btn-outline-navy px-5 py-2.5">İptal</button>
                <button type="submit" disabled={submitting} className="btn-navy px-5 py-2.5" data-testid="confirm-change-pw">
                  {submitting ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
