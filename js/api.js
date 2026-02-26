/* =========================================================
   api.js — util de API com token (Prompt 3)
   Endpoints esperados:
   - POST /api/login/
   - POST /api/register/
   - GET  /api/plan/for-student/   (Authorization: Bearer <token>)
   - POST /api/contract/preview/   { installments }
   - POST /api/contract/confirm/   { installments, payment_method: "pix"|"card" }
========================================================= */

(function () {
  // Se você já usa um domínio fixo, ajuste aqui.
  // Mantive o mesmo padrão do app.js anterior (Railway), mas você pode trocar.
  const API_BASE = "https://formatura-backend-production.up.railway.app/api";

  const TOKEN_KEY = "fi_token";

  function qs(sel) { return document.querySelector(sel); }

  function onlyDigits(str) {
    return String(str || "").replace(/\D/g, "");
  }

  function formatCPF(value) {
    const d = onlyDigits(value).slice(0, 11);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    const p4 = d.slice(9, 11);
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
    if (!text) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.classList.add(type);
    el.textContent = text;
  }

  function setToken(token) {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
  }
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );

    // Só injeta Authorization se tiver token
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    const ct = res.headers.get("content-type") || "";
    let data = null;

    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      const txt = await res.text();
      data = { ok: false, error: txt };
    }

    if (!res.ok) {
      const msg = data?.error || data?.detail || "Erro na requisição.";
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // Exporta no window (sem bundler)
  window.API = {
    API_BASE,
    qs,
    onlyDigits,
    formatCPF,
    moneyBRL,
    setMsg,
    setToken,
    getToken,
    clearToken,
    apiFetch,
  };
})();