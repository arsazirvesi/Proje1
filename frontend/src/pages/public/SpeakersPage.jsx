import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Linkedin } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState([]);

  useEffect(() => {
    axios.get(`${API}/speakers`).then(r => setSpeakers(r.data)).catch(() => {});
  }, []);

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      {/* Header */}
      <div className="pt-32 pb-12 text-center bg-gradient-to-b from-summit-paper to-transparent">
        <span className="section-overline section-overline-center">Zirve 2026</span>
        <h1 className="font-heading text-summit-navy text-4xl sm:text-5xl">Konuşmacılar</h1>
        <p className="text-gray-600 mt-4 max-w-2xl mx-auto px-4 text-sm sm:text-base">
          Arsa yatırımı, gayrimenkul hukuku ve yatırım danışmanlığı alanlarında derin uzmanlığa sahip konuşmacılarımızla tanışın.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {speakers.map((sp) => (
            <div
              key={sp.id}
              className="bg-white border border-gray-200 rounded-md overflow-hidden card-hover flex flex-col shadow-sm"
              data-testid={`speaker-card-${sp.id}`}
            >
              <div className="h-72 bg-cover" style={{ backgroundImage: `url(${sp.image_url})`, backgroundPosition: 'center 20%' }} />
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-heading text-summit-navy text-lg leading-tight">{sp.name}</h3>
                <p className="text-summit-navy text-xs mt-1.5 font-semibold uppercase tracking-wide opacity-80">{sp.title}</p>
                <p className="text-gray-600 text-xs mt-3 leading-relaxed flex-1">{sp.bio}</p>
                {sp.social_linkedin && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <a href={sp.social_linkedin} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-md bg-summit-paper border border-gray-200 flex items-center justify-center text-gray-500 hover:text-summit-navy hover:border-summit-navy/40 transition-colors">
                      <Linkedin size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
