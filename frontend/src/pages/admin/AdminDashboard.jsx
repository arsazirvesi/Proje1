import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Users, UserCheck, FileText, Calendar, Ticket, Building2, Megaphone, Mail, ArrowRight } from "lucide-react";
import { API_BASE as API } from "../../lib/api";

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
    { label: "Ziyaretçi Kaydı", value: data?.stats?.guests ?? 0, icon: Ticket, color: "text-summit-navy", bg: "bg-summit-navy/10", href: "/admin/ziyaretciler" },
    { label: "Fuar Stant Başvurusu", value: data?.stats?.exhibitors ?? 0, icon: Building2, color: "text-summit-navy", bg: "bg-summit-navy/10", href: "/admin/fuar-stant" },
    { label: "Konuşmacı / Sponsor", value: data?.stats?.speaker_applications ?? 0, icon: Megaphone, color: "text-summit-navy", bg: "bg-summit-navy/10", href: "/admin/konusmaci-basvuru" },
    { label: "Bülten Üyesi", value: data?.stats?.members ?? 0, icon: Mail, color: "text-gray-600", bg: "bg-gray-100", href: "/admin/bulten-uyeleri" },
    { label: "Blog Yazısı", value: data?.stats?.blog_posts ?? 0, icon: FileText, color: "text-gray-600", bg: "bg-gray-100", href: "/admin/blog" },
    { label: "Geçmiş Etkinlik", value: data?.stats?.events ?? 0, icon: Calendar, color: "text-gray-600", bg: "bg-gray-100", href: "/admin/etkinlikler" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl">Yönetici Paneli</h1>
        <p className="text-gray-500 text-sm mt-1">Arsa Yatırım Zirvesi 2026 · Kayıt ve içerik yönetimi</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-summit-navy border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
              <Link
                key={label}
                to={href}
                className="bg-white border border-gray-200 rounded-md p-5 card-hover"
                data-testid={`stat-card-${label}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 ${bg} rounded-md flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                  </div>
                  <ArrowRight size={14} className="text-gray-400 mt-1" />
                </div>
                <div className={`font-heading text-3xl font-bold ${color}`}>{value}</div>
                <div className="text-gray-500 text-xs mt-1">{label}</div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Visitors */}
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-heading text-summit-navy text-base">Son Ziyaretçi Kayıtları</h3>
                <Link to="/admin/ziyaretciler" className="text-summit-navy text-xs hover:underline font-medium">Tümünü Gör</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full admin-table">
                  <thead><tr><th>Ad</th><th>E-posta</th><th className="hidden sm:table-cell">Tarih</th></tr></thead>
                  <tbody>
                    {(!data?.recent_guests || data.recent_guests.length === 0) && (
                      <tr><td colSpan={3} className="text-center text-gray-500 py-6 text-sm">Henüz kayıt yok</td></tr>
                    )}
                    {data?.recent_guests?.map(g => (
                      <tr key={g.id}>
                        <td className="text-summit-navy text-sm font-medium">{g.name}</td>
                        <td className="text-gray-500 text-xs">{g.email}</td>
                        <td className="text-gray-500 text-xs hidden sm:table-cell">{new Date(g.created_at).toLocaleDateString("tr-TR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Exhibitors */}
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-heading text-summit-navy text-base">Son Stant Başvuruları</h3>
                <Link to="/admin/fuar-stant" className="text-summit-navy text-xs hover:underline font-medium">Tümünü Gör</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full admin-table">
                  <thead><tr><th>Firma</th><th>Yetkili</th><th className="hidden sm:table-cell">Tarih</th></tr></thead>
                  <tbody>
                    {(!data?.recent_exhibitors || data.recent_exhibitors.length === 0) && (
                      <tr><td colSpan={3} className="text-center text-gray-500 py-6 text-sm">Henüz başvuru yok</td></tr>
                    )}
                    {data?.recent_exhibitors?.map(g => (
                      <tr key={g.id}>
                        <td className="text-summit-navy text-sm font-medium">{g.company_name}</td>
                        <td className="text-gray-500 text-xs">{g.contact_name}</td>
                        <td className="text-gray-500 text-xs hidden sm:table-cell">{new Date(g.created_at).toLocaleDateString("tr-TR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Speaker Apps */}
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-heading text-summit-navy text-base">Son Konuşmacı / Sponsor Başvuruları</h3>
                <Link to="/admin/konusmaci-basvuru" className="text-summit-navy text-xs hover:underline font-medium">Tümünü Gör</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full admin-table">
                  <thead><tr><th>Tip</th><th>Ad / Firma</th><th>E-posta</th><th className="hidden sm:table-cell">Tarih</th></tr></thead>
                  <tbody>
                    {(!data?.recent_speaker_applications || data.recent_speaker_applications.length === 0) && (
                      <tr><td colSpan={4} className="text-center text-gray-500 py-6 text-sm">Henüz başvuru yok</td></tr>
                    )}
                    {data?.recent_speaker_applications?.map(g => (
                      <tr key={g.id}>
                        <td className="text-gray-700 text-xs font-medium uppercase">{g.application_type}</td>
                        <td className="text-summit-navy text-sm font-medium">{g.name}</td>
                        <td className="text-gray-500 text-xs">{g.email}</td>
                        <td className="text-gray-500 text-xs hidden sm:table-cell">{new Date(g.created_at).toLocaleDateString("tr-TR")}</td>
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
              { label: "Konuşmacı Ekle (Site)", href: "/admin/konusmacilar" },
              { label: "Blog Yaz", href: "/admin/blog" },
              { label: "Banner Güncelle", href: "/admin/bannerlar" },
              { label: "Program Düzenle", href: "/admin/program" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                className="bg-white border border-gray-200 rounded-md p-4 text-gray-600 text-xs text-center hover:border-summit-navy/30 hover:text-summit-navy transition-all"
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
