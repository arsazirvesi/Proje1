import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Users, UserCheck, FileText, Calendar, TrendingUp, ArrowRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/admin/dashboard`, { withCredentials: true })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Toplam Üye", value: data?.stats?.members ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/admin/uyeler" },
    { label: "Zirve Misafiri", value: data?.stats?.guests ?? 0, icon: UserCheck, color: "text-summit-gold", bg: "bg-summit-gold/10", href: "/admin/misafirler" },
    { label: "Blog Yazısı", value: data?.stats?.blog_posts ?? 0, icon: FileText, color: "text-purple-600", bg: "bg-purple-50", href: "/admin/blog" },
    { label: "Geçmiş Etkinlik", value: data?.stats?.events ?? 0, icon: Calendar, color: "text-green-600", bg: "bg-green-50", href: "/admin/etkinlikler" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Arsa Yatırım Zirvesi 2026 - Yönetici Paneli</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-summit-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
              <Link
                key={label}
                to={href}
                className="bg-white border border-gray-200 rounded-xl p-5 card-hover"
                data-testid={`stat-card-${label}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                  </div>
                  <ArrowRight size={14} className="text-gray-500 mt-1" />
                </div>
                <div className={`font-heading text-3xl font-bold ${color}`}>{value}</div>
                <div className="text-gray-500 text-xs mt-1">{label}</div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Members */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-heading text-summit-navy text-base">Son Üyeler</h3>
                <Link to="/admin/uyeler" className="text-summit-gold text-xs hover:underline">Tümünü Gör</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full admin-table">
                  <thead>
                    <tr>
                      <th className="text-left">Ad</th>
                      <th className="text-left">E-posta</th>
                      <th className="text-left hidden sm:table-cell">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent_members?.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-gray-500 py-6 text-sm">Henüz üye yok</td></tr>
                    )}
                    {data?.recent_members?.map(m => (
                      <tr key={m.id}>
                        <td className="text-summit-navy text-sm font-medium">{m.name}</td>
                        <td className="text-gray-500 text-xs">{m.email}</td>
                        <td className="text-gray-500 text-xs hidden sm:table-cell">
                          {new Date(m.created_at).toLocaleDateString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Guests */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-heading text-summit-navy text-base">Son Misafirler</h3>
                <Link to="/admin/misafirler" className="text-summit-gold text-xs hover:underline">Tümünü Gör</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full admin-table">
                  <thead>
                    <tr>
                      <th className="text-left">Ad</th>
                      <th className="text-left">E-posta</th>
                      <th className="text-left hidden sm:table-cell">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent_guests?.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-gray-500 py-6 text-sm">Henüz misafir yok</td></tr>
                    )}
                    {data?.recent_guests?.map(g => (
                      <tr key={g.id}>
                        <td className="text-summit-navy text-sm font-medium">{g.name}</td>
                        <td className="text-gray-500 text-xs">{g.email}</td>
                        <td className="text-gray-500 text-xs hidden sm:table-cell">
                          {new Date(g.created_at).toLocaleDateString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Konuşmacı Ekle", href: "/admin/konusmacilar" },
              { label: "Blog Yaz", href: "/admin/blog" },
              { label: "Banner Güncelle", href: "/admin/bannerlar" },
              { label: "Program Düzenle", href: "/admin/program" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                className="bg-white border border-gray-200 rounded-lg p-4 text-gray-500 text-xs text-center hover:border-summit-gold/30 hover:text-summit-gold transition-all"
              >
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
