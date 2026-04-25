import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import Analytics from "./components/Analytics";
import CookieConsent from "./components/CookieConsent";

import HomePage from "./pages/public/HomePage";
import SpeakersPage from "./pages/public/SpeakersPage";
import ProgramPage from "./pages/public/ProgramPage";
import RegisterPage from "./pages/public/RegisterPage";
import VisitorRegisterPage from "./pages/public/VisitorRegisterPage";
import ExhibitorRegisterPage from "./pages/public/ExhibitorRegisterPage";
import SpeakerApplicationPage from "./pages/public/SpeakerApplicationPage";
import PastEventsPage from "./pages/public/PastEventsPage";
import BlogPage from "./pages/public/BlogPage";
import BlogDetailPage from "./pages/public/BlogDetailPage";
import PrivacyPage from "./pages/public/PrivacyPage";
import KvkkPage from "./pages/public/KvkkPage";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MemberList from "./pages/admin/MemberList";
import GuestList from "./pages/admin/GuestList";
import ExhibitorList from "./pages/admin/ExhibitorList";
import SpeakerApplicationList from "./pages/admin/SpeakerApplicationList";
import AdminUsers from "./pages/admin/AdminUsers";
import SpeakerManagement from "./pages/admin/SpeakerManagement";
import SponsorManagement from "./pages/admin/SponsorManagement";
import BannerManagement from "./pages/admin/BannerManagement";
import BlogManagement from "./pages/admin/BlogManagement";
import EventManagement from "./pages/admin/EventManagement";
import ProgramManagement from "./pages/admin/ProgramManagement";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-summit-navy border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Analytics />
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/konusmacilar" element={<SpeakersPage />} />
            <Route path="/program" element={<ProgramPage />} />
            <Route path="/etkinlikler" element={<PastEventsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />
            <Route path="/gizlilik" element={<PrivacyPage />} />
            <Route path="/kvkk" element={<KvkkPage />} />

            {/* Registration Forms */}
            <Route path="/ziyaretci-kaydi" element={<VisitorRegisterPage />} />
            <Route path="/fuar-stant-kaydi" element={<ExhibitorRegisterPage />} />
            <Route path="/konusmaci-basvuru" element={<SpeakerApplicationPage />} />
            <Route path="/bulten" element={<RegisterPage />} />

            {/* Backward compat redirects */}
            <Route path="/zirve-kaydi" element={<Navigate to="/ziyaretci-kaydi" replace />} />
            <Route path="/uyelik" element={<Navigate to="/ziyaretci-kaydi" replace />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="ziyaretciler" element={<GuestList />} />
              <Route path="fuar-stant" element={<ExhibitorList />} />
              <Route path="konusmaci-basvuru" element={<SpeakerApplicationList />} />
              <Route path="bulten-uyeleri" element={<MemberList />} />
              <Route path="konusmacilar" element={<SpeakerManagement />} />
              <Route path="sponsorlar" element={<SponsorManagement />} />
              <Route path="bannerlar" element={<BannerManagement />} />
              <Route path="blog" element={<BlogManagement />} />
              <Route path="etkinlikler" element={<EventManagement />} />
              <Route path="program" element={<ProgramManagement />} />
              <Route path="kullanicilar" element={<AdminUsers />} />
              {/* Backward compat for old URLs */}
              <Route path="uyeler" element={<Navigate to="/admin/bulten-uyeleri" replace />} />
              <Route path="misafirler" element={<Navigate to="/admin/ziyaretciler" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
