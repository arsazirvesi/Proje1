import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Calendar, Tag, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/blog`).then(r => setPosts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-32 pb-16 text-center bg-gradient-to-b from-gray-50 to-transparent">
        <span className="section-overline">İçerik & Makaleler</span>
        <h1 className="font-heading text-summit-navy text-5xl sm:text-6xl">Blog</h1>
        <p className="text-gray-600 mt-4 max-w-2xl mx-auto px-4">
          Arsa yatırımı, gayrimenkul piyasası ve yatırım stratejileri hakkında güncel makaleler.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-2 border-summit-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-summit-gold/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Tag size={24} className="text-summit-gold" />
            </div>
            <h3 className="font-heading text-summit-navy text-2xl">Henüz İçerik Yok</h3>
            <p className="text-gray-500 text-sm mt-3">Blog yazıları yakında eklenecektir.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {posts.map((post, i) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="blog-card"
                style={{ animationDelay: `${i * 0.08}s` }}
                data-testid={`blog-card-${post.id}`}
              >
                {post.image_url && (
                  <div
                    className="h-44 bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.image_url})` }}
                  />
                )}
                {!post.image_url && (
                  <div className="h-44 bg-gradient-to-br from-summit-surface to-white flex items-center justify-center">
                    <Tag size={32} className="text-summit-gold/30" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-summit-gold/10 text-summit-gold px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-heading text-summit-navy text-lg font-semibold leading-snug line-clamp-2">{post.title}</h3>
                  {post.excerpt && (
                    <p className="text-gray-500 text-xs mt-3 leading-relaxed line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(post.created_at).toLocaleDateString("tr-TR")}
                    </span>
                    <span className="text-summit-gold text-xs flex items-center gap-1">
                      Oku <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
