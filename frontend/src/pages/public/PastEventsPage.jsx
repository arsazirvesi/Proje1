import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Calendar, MapPin, Users } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function PastEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/events`).then(r => setEvents(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-summit-navy min-h-screen font-body">
      <Navbar />

      <div className="pt-32 pb-16 text-center bg-gradient-to-b from-summit-paper/50 to-transparent">
        <span className="section-overline">Geçmiş Yıllar</span>
        <h1 className="font-heading text-white text-5xl sm:text-6xl">Geçmiş Etkinlikler</h1>
        <p className="text-summit-text-secondary mt-4 max-w-2xl mx-auto px-4">
          Her yıl büyüyen Arsa Yatırım Zirvesi'nin geçmiş yıllarına bir göz atın.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-2 border-summit-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((ev, i) => (
              <div
                key={ev.id}
                className="group bg-summit-paper rounded-2xl border border-white/8 overflow-hidden card-hover"
                style={{ animationDelay: `${i * 0.1}s` }}
                data-testid={`event-card-${ev.id}`}
              >
                <div className="relative h-52 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${ev.image_url || "https://images.pexels.com/photos/26202153/pexels-photo-26202153.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-summit-navy/80 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-summit-gold text-summit-navy text-sm font-heading font-bold px-3 py-1 rounded-lg">
                      {ev.year}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-heading text-white text-xl font-bold">{ev.title}</h3>

                  <div className="flex flex-col gap-2 mt-4">
                    <div className="flex items-center gap-2 text-summit-text-muted text-xs">
                      <MapPin size={13} className="text-summit-gold shrink-0" />
                      {ev.venue}
                    </div>
                    {ev.attendee_count && (
                      <div className="flex items-center gap-2 text-summit-text-muted text-xs">
                        <Users size={13} className="text-summit-gold shrink-0" />
                        {ev.attendee_count}+ Katılımcı
                      </div>
                    )}
                    {ev.speakers_count && (
                      <div className="flex items-center gap-2 text-summit-text-muted text-xs">
                        <Calendar size={13} className="text-summit-gold shrink-0" />
                        {ev.speakers_count} Konuşmacı
                      </div>
                    )}
                  </div>

                  {ev.description && (
                    <p className="text-summit-text-secondary text-xs mt-4 leading-relaxed line-clamp-3">{ev.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Next event teaser */}
        <div className="mt-16 bg-gradient-to-r from-summit-gold/10 to-summit-gold/5 border border-summit-gold/25 rounded-2xl p-8 text-center">
          <span className="section-overline">Sıradaki</span>
          <h2 className="font-heading text-white text-3xl sm:text-4xl">4. Arsa Yatırım Zirvesi 2026</h2>
          <p className="text-summit-text-secondary text-sm mt-3">
            21 Mayıs 2026 &bull; Hilton İstanbul Bosphorus
          </p>
          <a href="/zirve-kaydi" className="btn-gold px-8 py-3 text-sm mt-6 inline-block" data-testid="next-event-register-btn">
            Hemen Kaydol
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
