import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Link } from "react-router-dom";
import { Star, Linkedin } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState([]);

  useEffect(() => {
    axios.get(`${API}/speakers`).then(r => setSpeakers(r.data)).catch(() => {});
  }, []);

  const featured = speakers.find(s => s.is_featured);
  const others = speakers.filter(s => !s.is_featured);

  return (
    <div className="bg-summit-navy min-h-screen font-body">
      <Navbar />

      {/* Header */}
      <div className="pt-32 pb-16 text-center bg-gradient-to-b from-summit-paper/50 to-transparent">
        <span className="section-overline">Zirve 2026</span>
        <h1 className="font-heading text-white text-5xl sm:text-6xl">Konuşmacılar</h1>
        <p className="text-summit-text-secondary mt-4 max-w-2xl mx-auto px-4">
          Arsa yatırımı, gayrimenkul hukuku ve yatırım danışmanlığı alanlarında derin uzmanlığa sahip konuşmacılarımızla tanışın.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Featured Speaker */}
        {featured && (
          <div className="mb-14" data-testid="featured-speaker">
            <div className="relative rounded-2xl overflow-hidden border border-summit-gold/30 gold-glow">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div
                  className="h-64 lg:h-auto min-h-80"
                  style={{
                    backgroundImage: `url(${featured.image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center top",
                  }}
                />
                <div className="bg-gradient-to-br from-summit-paper to-summit-navy p-8 sm:p-12 flex flex-col justify-center">
                  <span className="featured-badge mb-4 inline-block w-fit">Zirve Sahibi & Organizatör</span>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-summit-gold fill-summit-gold" />)}
                  </div>
                  <h2 className="font-heading text-white text-3xl sm:text-4xl font-bold">{featured.name}</h2>
                  <p className="text-summit-gold text-lg mt-2 font-medium">{featured.title}</p>
                  <p className="text-summit-text-secondary text-sm mt-5 leading-relaxed">{featured.bio}</p>
                  <div className="mt-8">
                    <Link to="/zirve-kaydi" className="btn-gold px-6 py-3 text-sm" data-testid="featured-register-btn">
                      Zirveye Katıl
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other speakers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {others.map((sp, i) => (
            <div
              key={sp.id}
              className="bg-summit-paper rounded-2xl border border-white/8 overflow-hidden card-hover"
              style={{ animationDelay: `${i * 0.1}s` }}
              data-testid={`speaker-card-${sp.id}`}
            >
              <div
                className="h-64 bg-cover bg-top"
                style={{ backgroundImage: `url(${sp.image_url})` }}
              />
              <div className="p-6">
                <h3 className="font-heading text-white text-xl font-bold">{sp.name}</h3>
                <p className="text-summit-gold text-sm mt-1.5">{sp.title}</p>
                <p className="text-summit-text-secondary text-sm mt-4 leading-relaxed line-clamp-3">{sp.bio}</p>
                <div className="mt-5 flex items-center gap-3">
                  {sp.social_linkedin && (
                    <a href={sp.social_linkedin} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-summit-surface border border-white/10 flex items-center justify-center text-summit-text-muted hover:text-summit-gold hover:border-summit-gold/30 transition-colors">
                      <Linkedin size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
