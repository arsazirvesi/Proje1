import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plug, Save, RefreshCw, Send, AlertCircle, CheckCircle2, XCircle,
  ToggleLeft, ToggleRight, FlaskConical, Eye, EyeOff, Filter
} from "lucide-react";
import { API_BASE as API } from "../../lib/api";

const SCOPE_LABEL = {
  both: "Zirve + Fuar",
  summit: "Sadece Zirve",
  fair: "Sadece Fuar",
};

export default function VisitegoSync() {
  const [cfg, setCfg] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState(""); // '', 'ok', 'failed'
  const [token, setToken] = useState("");
  const [revealToken, setRevealToken] = useState(false);
  const [scope, setScope] = useState("both");
  const [autoPush, setAutoPush] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, s, l] = await Promise.all([
        axios.get(`${API}/admin/visitego/config`, { withCredentials: true }),
        axios.get(`${API}/admin/visitego/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/visitego/logs?limit=200${logFilter ? `&status=${logFilter}` : ""}`, { withCredentials: true }),
      ]);
      setCfg(c.data); setStats(s.data); setLogs(l.data);
      setEnabled(c.data.enabled);
      setAutoPush(c.data.auto_push);
      setScope(c.data.scope || "both");
    } catch (e) {
      setError(e.response?.data?.detail || "Yüklenemedi");
    }
  }, [logFilter]);

  useEffect(() => { load(); }, [load]);

  const saveCfg = async (e) => {
    e?.preventDefault();
    setSavingCfg(true); setError("");
    try {
      const body = { enabled, auto_push: autoPush, scope };
      if (token.trim()) body.token = token.trim();
      await axios.put(`${API}/admin/visitego/config`, body, { withCredentials: true });
      setToken("");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Kaydetme başarısız");
    } finally {
      setSavingCfg(false);
    }
  };

  const runTest = async () => {
    setTesting(true); setTestResult(null); setError("");
    try {
      const { data } = await axios.post(`${API}/admin/visitego/test`, {}, { withCredentials: true });
      setTestResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Test başarısız");
    } finally {
      setTesting(false);
    }
  };

  const runSync = async (onlyFailed = false) => {
    if (!window.confirm(onlyFailed
      ? "Hata alan tüm misafirler tekrar denenecek. Devam etmek istiyor musunuz?"
      : "Tüm doğrulanmış misafirler Visitego'ya push edilecek. Devam etmek istiyor musunuz?"
    )) return;
    setSyncing(true); setSyncMsg(""); setError("");
    try {
      const { data } = await axios.post(
        `${API}/admin/visitego/sync-all?only_failed=${onlyFailed}`, {}, { withCredentials: true }
      );
      setSyncMsg(`İşlem başlatıldı. Yaklaşık ${data.approx_pending} misafir işleniyor (background). Birkaç saniye sonra "Yenile" butonuna basın.`);
    } catch (err) {
      setError(err.response?.data?.detail || "Sync başlatılamadı");
    } finally {
      setSyncing(false);
    }
  };

  if (!cfg) return <div className="p-6 text-gray-500">Yükleniyor…</div>;

  return (
    <div className="space-y-5" data-testid="visitego-page">
      {/* HEADER */}
      <div>
        <h1 className="font-heading text-summit-navy text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Plug size={24} /> Visitego Entegrasyonu
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          E-posta doğrulanmış misafirleri otomatik olarak Visitego (fuar şirketi turnike sistemi) sistemine push eder.
          Yaka kartlarımızdaki QR kodları onların turnikelerinde tanınır.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* WARNING: integration not yet active */}
      {(!cfg.enabled || !cfg.has_token) && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3" data-testid="not-active-warning">
          <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-amber-900 mb-1">⚠ Visitego entegrasyonu HENÜZ AKTİF DEĞİL</div>
            <div className="text-sm text-amber-800 leading-relaxed">
              {!cfg.has_token && <span>• Token girilmemiş veya kaydedilmemiş.<br/></span>}
              {cfg.has_token && !cfg.enabled && <span>• Token kayıtlı ama <strong>"Entegrasyon Aktif"</strong> kapalı.<br/></span>}
              <strong>Aşağıdaki ayarları doldurup mutlaka <em>"Ayarları Kaydet"</em> butonuna basın.</strong> Aksi halde yeni doğrulanan misafirler Visitego'ya gitmez.
            </div>
          </div>
        </div>
      )}

      {/* WARNING: unsaved changes */}
      {cfg.has_token && cfg.enabled && (
        (token.trim() !== "" || enabled !== cfg.enabled || autoPush !== cfg.auto_push || scope !== cfg.scope) && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 flex items-start gap-3" data-testid="unsaved-warning">
            <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Kaydedilmemiş değişiklikleriniz var.</strong> Yeni ayarlarınızın etkin olması için <em>"Ayarları Kaydet"</em> butonuna basın.
            </div>
          </div>
        )
      )}

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="visitego-stats">
          <StatCard label="Push Hedefi" value={stats.total_eligible} sub={`Kapsam: ${SCOPE_LABEL[stats.scope]}`} />
          <StatCard label="Başarılı" value={stats.synced} sub="Visitego'da var" tone="success" />
          <StatCard label="Hatalı" value={stats.failed} sub="Tekrar denenebilir" tone="danger" />
          <StatCard label="Bekliyor" value={stats.pending} sub="Henüz denenmedi" tone="warning" />
        </div>
      )}

      {/* CONFIG */}
      <form onSubmit={saveCfg} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4" data-testid="visitego-config-form">
        <h2 className="font-heading text-summit-navy text-lg font-semibold">Bağlantı Ayarları</h2>

        <div>
          <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">
            Visitego Token
          </label>
          {cfg.has_token && !token && (
            <div className="flex items-center gap-2 bg-summit-paper border border-gray-200 rounded-md px-3 py-2 mb-2">
              <span className="font-mono text-summit-navy text-xs flex-1 truncate" data-testid="current-token-masked">
                {revealToken ? "—" : cfg.token_masked} <span className="text-gray-400 ml-2">(kayıtlı)</span>
              </span>
              <button type="button" onClick={() => setRevealToken(r => !r)} className="text-gray-400 hover:text-summit-navy" title="Yeni token girmek istiyorsanız aşağıdaki kutuya yazın">
                {revealToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          )}
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={cfg.has_token ? "Yeni token girin (sadece değiştirmek isterseniz)" : "Fuar şirketinin verdiği token"}
            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm font-mono focus:outline-none focus:border-summit-navy"
            data-testid="token-input"
          />
          <p className="text-xs text-gray-500 mt-1">
            Token URL içine gömülü gönderilir: <code>https://visitego.com/api/v1/online/<strong>TOKEN</strong>/create</code>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-600 text-xs uppercase tracking-wider mb-1.5 block font-semibold">Push Kapsamı</label>
            <select
              value={scope}
              onChange={e => setScope(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-summit-navy text-sm focus:outline-none focus:border-summit-navy"
              data-testid="scope-select"
            >
              <option value="both">Zirve + Fuar (her ikisi)</option>
              <option value="fair">Sadece Fuar Ziyaretçileri</option>
              <option value="summit">Sadece Zirve Ziyaretçileri</option>
            </select>
          </div>
          <div className="flex flex-col gap-3">
            <ToggleRow
              label="Entegrasyon Aktif"
              hint="Kapatılırsa hiçbir push yapılmaz"
              checked={enabled}
              onChange={setEnabled}
              testid="toggle-enabled"
            />
            <ToggleRow
              label="Otomatik Push"
              hint="Her e-posta doğrulamasından sonra anında gönder"
              checked={autoPush}
              onChange={setAutoPush}
              testid="toggle-autopush"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={savingCfg}
            className="inline-flex items-center gap-2 bg-summit-navy text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-summit-navy-dark transition-colors disabled:opacity-50"
            data-testid="save-config-btn"
          >
            <Save size={15} /> {savingCfg ? "Kaydediliyor…" : "Ayarları Kaydet"}
          </button>
          <button
            type="button"
            onClick={runTest}
            disabled={!cfg.has_token || testing}
            className="inline-flex items-center gap-2 bg-white border border-summit-navy text-summit-navy rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-summit-paper transition-colors disabled:opacity-50"
            data-testid="test-btn"
            title={!cfg.has_token ? "Önce token kaydedin" : "Visitego'ya sahte test verisi gönder"}
          >
            <FlaskConical size={15} /> {testing ? "Test ediliyor…" : "Test Bağlantısı"}
          </button>
        </div>

        {testResult && (
          <div className={`rounded-md p-3 text-xs font-mono ${testResult.ok ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-900"}`} data-testid="test-result">
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              HTTP {testResult.status ?? "—"} • {testResult.ok ? "BAĞLANTI BAŞARILI" : (testResult.error || "BAĞLANTI BAŞARISIZ")}
            </div>
            <div className="text-[10px] opacity-80 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
              {testResult.response || "(yanıt yok)"}
            </div>
          </div>
        )}
      </form>

      {/* SYNC ACTIONS */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="font-heading text-summit-navy text-lg font-semibold">Toplu Sync</h2>
        <p className="text-sm text-gray-600">
          Tüm doğrulanmış misafirleri arka planda Visitego'ya push eder. Birkaç saniye sürebilir.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runSync(false)}
            disabled={syncing || !cfg.enabled || !cfg.has_token}
            className="inline-flex items-center gap-2 bg-summit-navy text-white rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-summit-navy-dark transition-colors disabled:opacity-50"
            data-testid="sync-all-btn"
          >
            <Send size={15} /> Tümünü Sync Et
          </button>
          <button
            onClick={() => runSync(true)}
            disabled={syncing || !cfg.enabled || !cfg.has_token}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
            data-testid="sync-failed-btn"
          >
            <RefreshCw size={15} /> Sadece Hatalıları Tekrar Dene
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 bg-summit-paper border border-gray-200 text-summit-navy rounded-md px-4 py-2.5 text-sm font-semibold hover:bg-white transition-colors"
            data-testid="refresh-btn"
          >
            <RefreshCw size={15} /> Yenile
          </button>
        </div>
        {syncMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-md p-3 text-sm" data-testid="sync-msg">
            {syncMsg}
          </div>
        )}
      </div>

      {/* LOGS */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-heading text-summit-navy text-lg font-semibold">Sync Geçmişi</h2>
          <div className="inline-flex items-center gap-1.5 bg-summit-paper rounded-md p-1" data-testid="log-filter">
            <Filter size={13} className="text-gray-500 ml-1" />
            {[
              { v: "", l: "Tümü" }, { v: "ok", l: "Başarılı" }, { v: "failed", l: "Hatalı" },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setLogFilter(f.v)}
                className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${logFilter === f.v ? "bg-summit-navy text-white" : "text-gray-600 hover:text-summit-navy"}`}
                data-testid={`filter-${f.v || "all"}`}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">Henüz sync kaydı yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-summit-paper border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-600 font-semibold">Tarih</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-600 font-semibold">Durum</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-600 font-semibold">Misafir</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-600 font-semibold">Tip</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-600 font-semibold">QR Kodu</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-600 font-semibold">HTTP</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-600 font-semibold">Hata / Yanıt</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l._id} className="border-b border-gray-100 hover:bg-summit-paper/50">
                    <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-2.5">
                      {l.ok ? (
                        <span className="inline-flex items-center gap-1 text-green-700 text-xs font-bold uppercase">
                          <CheckCircle2 size={13} /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 text-xs font-bold uppercase">
                          <XCircle size={13} /> Hata
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-summit-navy">
                      <div className="font-medium">{l.name || "—"}</div>
                      <div className="text-xs text-gray-500">{l.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[0.65rem] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${l.visit_type === "fair" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-summit-navy"}`}>
                        {l.visit_type === "fair" ? "Fuar" : "Zirve"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{l.qrcode}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{l.status_code ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 max-w-md truncate" title={l.error || l.response}>
                      {l.error || l.response || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone = "default" }) {
  const toneCls = {
    default: "border-gray-200",
    success: "border-green-300 bg-green-50/40",
    danger: "border-red-300 bg-red-50/40",
    warning: "border-amber-300 bg-amber-50/40",
  }[tone];
  return (
    <div className={`bg-white border ${toneCls} rounded-xl p-4`}>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      <div className="text-2xl font-bold text-summit-navy mt-1">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange, testid }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-left"
      data-testid={testid}
    >
      {checked ? (
        <ToggleRight size={32} className="text-green-600 shrink-0" />
      ) : (
        <ToggleLeft size={32} className="text-gray-400 shrink-0" />
      )}
      <div>
        <div className={`text-sm font-semibold ${checked ? "text-summit-navy" : "text-gray-500"}`}>{label}</div>
        <div className="text-xs text-gray-500">{hint}</div>
      </div>
    </button>
  );
}
