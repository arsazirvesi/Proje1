import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Clock, Users, Coffee, MessageSquare } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const SESSION_TYPES = {
  talk: { label: "Sunum", color: "bg-summit-gold text-summit-navy", border: "border-l-summit-gold" },
  panel: { label: "Panel", color: "bg-purple-500 text-white", border: "border-l-purple-500" },
  break: { label: "Ara", color: "bg-slate-500 text-white", border: "border-l-slate-500" },
  networking: { label: "Networking", color: "bg-green-600 text-white", border: "border-l-green-500" },
};

export default function ProgramPage() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    axios.get(`${API}/program`).then(r => setSessions(r.data)).catch(() => {});
  }, []);

  return (
    <div className="bg-summit-navy min-h-screen font-body">
      <Navbar />

      {/* Header */}
      <div className="pt-32 pb-16 text-center bg-gradient-to-b from-summit-paper/50 to-transparent">
        <span className="section-overline">21 Mayıs 2026</span>
        <h1 className="font-heading text-white text-5xl sm:text-6xl">Zirve Programı</h1>
        <p className="text-summit-text-secondary mt-4 max-w-2xl mx-auto px-4">
          Hilton İstanbul Bosphorus, Zirve Salonu
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-10 justify-center">
          {Object.entries(SESSION_TYPES).map(([key, val]) => (
            <span key={key} className={`text-xs font-medium px-3 py-1.5 rounded-full ${val.color}`}>
              {val.label}
            </span>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[72px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-summit-gold/20 to-transparent" />

          <div className="space-y-4">
            {sessions.map((session, i) => {
              const typeInfo = SESSION_TYPES[session.session_type] || SESSION_TYPES.talk;
              const isBreak = session.session_type === "break" || session.session_type === "networking";

              return (
                <div
                  key={session.id}
                  className={`flex gap-5 items-start animate-fade-in`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  data-testid={`program-session-${i}`}
                >
                  {/* Time */}
                  <div className="text-right w-14 shrink-0 pt-4">
                    <span className="text-summit-gold text-xs font-mono font-bold block">{session.time_start}</span>
                    <span className="text-summit-text-muted text-xs font-mono block">{session.time_end}</span>
                  </div>

                  {/* Dot */}
                  <div className="relative flex items-start pt-4">
                    <div className={`w-3 h-3 rounded-full border-2 border-summit-gold shrink-0 z-10 ${isBreak ? "bg-transparent" : "bg-summit-gold"}`} />
                  </div>

                  {/* Card */}
                  <div className={`flex-1 rounded-xl border border-white/8 border-l-4 p-4 mb-0 ${
                    isBreak ? "bg-summit-surface/30 opacity-70" : "bg-summit-paper"
                  } ${typeInfo.border}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <h4 className={`font-heading font-semibold ${isBreak ? "text-summit-text-muted text-sm" : "text-white text-base"}`}>
                          {session.title}
                        </h4>
                        {session.speaker_name && (
                          <p className="text-summit-gold text-xs mt-1.5 flex items-center gap-1">
                            <Users size={11} />
                            {session.speaker_name}
                          </p>
                        )}
                        {session.description && (
                          <p className="text-summit-text-muted text-xs mt-2 leading-relaxed">{session.description}</p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div className="mt-14 bg-summit-paper border border-summit-gold/20 rounded-xl p-6 text-center">
          <p className="text-summit-text-secondary text-sm">
            Program değişiklik hakkı saklıdır. Güncel bilgiler için bültenimize abone olun.
          </p>
          <a href="/uyelik" className="btn-gold px-6 py-2.5 text-sm mt-4 inline-block">
            Bültene Abone Ol
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
