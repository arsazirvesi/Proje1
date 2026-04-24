import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard, Users, UserCheck, Mic2, Award, Image, FileText,
  Calendar, ListOrdered, LogOut, Menu, ChevronRight
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Üyeler", href: "/admin/uyeler", icon: Users },
  { label: "Zirve Misafirleri", href: "/admin/misafirler", icon: UserCheck },
  { label: "Konuşmacılar", href: "/admin/konusmacilar", icon: Mic2 },
  { label: "Sponsorlar", href: "/admin/sponsorlar", icon: Award },
  { label: "Banner Yönetimi", href: "/admin/bannerlar", icon: Image },
  { label: "Blog", href: "/admin/blog", icon: FileText },
  { label: "Geçmiş Etkinlikler", href: "/admin/etkinlikler", icon: Calendar },
  { label: "Program", href: "/admin/program", icon: ListOrdered },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const isActive = (href) => {
    if (href === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(href);
  };

  const Sidebar = () => (
    <div className="admin-sidebar w-64 h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-summit-gold to-summit-gold-light rounded-lg flex items-center justify-center shrink-0">
            <span className="font-heading font-bold text-white text-xs">AYZ</span>
          </div>
          <div>
            <div className="text-summit-navy text-sm font-semibold font-heading">Yönetici Paneli</div>
            <div className="text-summit-gold text-xs">Zirvesi 2026</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            onClick={() => setSidebarOpen(false)}
            className={`admin-nav-item flex items-center gap-3 px-5 py-2.5 text-sm transition-all ${
              isActive(href)
                ? "active text-summit-navy font-semibold"
                : "text-gray-600 hover:text-summit-navy"
            }`}
            data-testid={`admin-nav-${label}`}
          >
            <Icon size={16} className={isActive(href) ? "text-summit-gold" : ""} />
            {label}
            {isActive(href) && <ChevronRight size={13} className="ml-auto text-summit-gold" />}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-summit-gold/10 rounded-full flex items-center justify-center">
            <span className="text-summit-gold text-xs font-bold">{user?.name?.[0] || "A"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-summit-navy text-xs font-medium truncate">{user?.name || "Admin"}</div>
            <div className="text-gray-500 text-xs truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-gray-500 hover:text-red-500 text-xs py-2 transition-colors"
          data-testid="admin-logout-btn"
        >
          <LogOut size={14} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-summit-paper overflow-hidden font-body">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shrink-0">
          <button
            className="lg:hidden text-gray-600 hover:text-summit-navy p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-summit-gold transition-colors hidden sm:block">
              Siteyi Görüntüle →
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
