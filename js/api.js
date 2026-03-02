/* =========================================================
   api.js — util de API com token (produção GitHub Pages)
   Endpoints:
   - POST /api/login/
   - POST /api/register/
   - GET  /api/plan/for-student/   (Authorization: Bearer <token>)
   - POST /api/contract/preview/   { installments }
   - POST /api/contract/confirm/   { installments, payment_method }
========================================================= */

(function () {
  // ✅ Backend Railway
  const API_ORIGIN = "https://formatura-backend-production.up.railway.app";
  const API_PREFIX = "/api"; // mantém /api separado pra evitar erro de concatenação
  const API_BASE = `${API_ORIGIN}${API_PREFIX}`;

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

  function normalizePath(path) {
    // garante que path começa com "/"
    let p = String(path || "");
    if (!p.startsWith("/")) p = "/" + p;
    return p;
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );

    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${API_BASE}${normalizePath(path)}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const ct = res.headers.get("content-type") || "";
    let data;

    // tenta JSON, senão texto
    if (ct.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = { ok: false, error: "Resposta JSON inválida." };
      }
    } else {
      const txt = await res.text();
      data = { ok: false, error: txt };
    }

    if (!res.ok) {
      // tenta extrair msg útil
      const msg =
        data?.error ||
        data?.detail ||
        (typeof data === "string" ? data : "") ||
        `Erro na requisição (${res.status}).`;

      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      err.url = url;
      throw err;
    }

    return data;
  }

  // Exporta no window
  window.API = {
    API_ORIGIN,
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
