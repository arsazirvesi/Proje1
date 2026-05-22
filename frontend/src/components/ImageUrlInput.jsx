import React, { useRef, useState } from "react";
import axios from "axios";
import { Upload, Loader2 } from "lucide-react";
import { API_BASE as API } from "../lib/api";

/**
 * Image URL field with an "Upload" button.
 * Uploads to /api/admin/uploads/image (Cloudflare R2 + optimization) and
 * fills the URL field with the returned public URL.
 *
 * Props:
 *   value, onChange (url string)
 *   placeholder (optional)
 *   testIdPrefix (optional, default 'img')
 */
export default function ImageUrlInput({ value, onChange, placeholder = "Görsel URL'si veya yükleyin", testIdPrefix = "img" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const pick = () => fileRef.current?.click();

  const handle = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be picked again
    if (!file) return;
    setErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post(`${API}/admin/uploads/image`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.url) onChange(data.url);
      else setErr("URL alınamadı");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="url"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-summit-navy text-sm focus:outline-none focus:border-summit-gold/50"
          data-testid={`${testIdPrefix}-url-input`}
        />
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 bg-summit-navy text-white text-xs font-semibold rounded-lg hover:bg-summit-navy-dark disabled:opacity-60 transition-colors whitespace-nowrap"
          data-testid={`${testIdPrefix}-upload-btn`}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Yükleniyor..." : "Yükle"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          onChange={handle}
          className="hidden"
        />
      </div>
      {err && <div className="text-red-600 text-[11px] mt-1">{err}</div>}
      {value && !uploading && (
        <div className="mt-1.5 text-[10px] text-gray-400 truncate">{value}</div>
      )}
    </div>
  );
}
