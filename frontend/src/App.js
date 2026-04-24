import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import HomePage from "./pages/public/HomePage";
import SpeakersPage from "./pages/public/SpeakersPage";
import ProgramPage from "./pages/public/ProgramPage";
import RegisterPage from "./pages/public/RegisterPage";
import GuestRegisterPage from "./pages/public/GuestRegisterPage";
import PastEventsPage from "./pages/public/PastEventsPage";
import BlogPage from "./pages/public/BlogPage";
import BlogDetailPage from "./pages/public/BlogDetailPage";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MemberList from "./pages/admin/MemberList";
import GuestList from "./pages/admin/GuestList";
import SpeakerManagement from "./pages/admin/SpeakerManagement";
import SponsorManagement from "./pages/admin/SponsorManagement";
import BannerManagement from "./pages/admin/BannerManagement";
import BlogManagement from "./pages/admin/BlogManagement";
import EventManagement from "./pages/admin/EventManagement";
import ProgramManagement from "./pages/admin/ProgramManagement";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-summit-navy flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-summit-gold border-t-transparent rounded-full animate-spin" />
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
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/konusmacilar" element={<SpeakersPage />} />
            <Route path="/program" element={<ProgramPage />} />
            <Route path="/uyelik" element={<RegisterPage />} />
            <Route path="/zirve-kaydi" element={<GuestRegisterPage />} />
            <Route path="/etkinlikler" element={<PastEventsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="uyeler" element={<MemberList />} />
              <Route path="misafirler" element={<GuestList />} />
              <Route path="konusmacilar" element={<SpeakerManagement />} />
              <Route path="sponsorlar" element={<SponsorManagement />} />
              <Route path="bannerlar" element={<BannerManagement />} />
              <Route path="blog" element={<BlogManagement />} />
              <Route path="etkinlikler" element={<EventManagement />} />
              <Route path="program" element={<ProgramManagement />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
