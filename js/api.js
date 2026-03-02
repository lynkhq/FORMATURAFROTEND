(function () {
  const API_ORIGIN = "https://formatura-backend-production.up.railway.app";
  const API_BASE = `${API_ORIGIN}/api`;

  const SESSION_KEY = "fi_session_v1"; // {student_id, student_name}

  function qs(sel) { return document.querySelector(sel); }
  function onlyDigits(str) { return String(str || "").replace(/\D/g, ""); }

  function formatCPF(value) {
    const d = onlyDigits(value).slice(0, 11);
    const p1 = d.slice(0, 3), p2 = d.slice(3, 6), p3 = d.slice(6, 9), p4 = d.slice(9, 11);
    let out = p1;
    if (p2) out += "." + p2;
    if (p3) out += "." + p3;
    if (p4) out += "-" + p4;
    return out;
  }

  function moneyBRL(value) {
    const n = Number(value || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function setMsg(el, type, text) {
    if (!el) return;
    el.classList.remove("is-error", "is-success", "is-info");
    if (!text) { el.style.display = "none"; el.textContent = ""; return; }
    el.style.display = "block";
    el.classList.add(type);
    el.textContent = text;
  }

  function setSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session || {}));
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}"); }
    catch { return {}; }
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function requireLogin() {
    const s = getSession();
    if (!s?.student_id) {
      window.location.href = "./login.html";
      return null;
    }
    return s;
  }

  function normalizePath(path) {
    let p = String(path || "");
    if (!p.startsWith("/")) p = "/" + p;
    return p;
  }

  async function apiFetch(path, options = {}) {
    const url = `${API_BASE}${normalizePath(path)}`;
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );

    const res = await fetch(url, { ...options, headers });

    const ct = res.headers.get("content-type") || "";
    let data;
    if (ct.includes("application/json")) data = await res.json();
    else data = { ok: false, error: await res.text() };

    if (!res.ok) {
      const msg = data?.error || data?.detail || `Erro (${res.status}).`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      err.url = url;
      throw err;
    }
    return data;
  }

  window.API = {
    API_ORIGIN,
    API_BASE,
    qs,
    onlyDigits,
    formatCPF,
    moneyBRL,
    setMsg,
    setSession,
    getSession,
    clearSession,
    requireLogin,
    apiFetch,
  };
})();
