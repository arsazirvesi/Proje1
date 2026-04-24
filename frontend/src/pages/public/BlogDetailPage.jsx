import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Calendar, Tag, ArrowLeft } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function BlogDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`${API}/blog/${slug}`)
      .then(r => setPost(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-2 border-summit-gold border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (error || !post) return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="flex flex-col justify-center items-center min-h-screen gap-5">
        <h2 className="font-heading text-summit-navy text-3xl">Blog yazısı bulunamadı</h2>
        <Link to="/blog" className="btn-gold px-6 py-3 text-sm">Blog'a Dön</Link>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen font-body">
      <Navbar />

      <div className="pt-28 pb-24">
        {/* Hero image */}
        {post.image_url && (
          <div
            className="w-full h-72 sm:h-96 bg-cover bg-center mb-0"
            style={{ backgroundImage: `url(${post.image_url})` }}
          >
            <div className="w-full h-full bg-gradient-to-b from-transparent to-white" />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-summit-gold text-sm mb-8 mt-8 transition-colors">
            <ArrowLeft size={16} />
            Blog'a Dön
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags?.map(tag => (
              <span key={tag} className="text-xs bg-summit-gold/10 text-summit-gold px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="font-heading text-summit-navy text-3xl sm:text-4xl lg:text-5xl leading-tight">{post.title}</h1>

          <div className="flex items-center gap-5 mt-5 pb-6 border-b border-gray-200">
            <span className="text-gray-500 text-sm flex items-center gap-1.5">
              <Calendar size={14} className="text-summit-gold" />
              {new Date(post.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="text-summit-gold text-sm font-medium">{post.author}</span>
          </div>

          <div
            className="mt-8 text-gray-600 text-base leading-relaxed prose-custom"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {post.content}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
