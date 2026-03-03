/* =========================================================
   app.js — Integração REAL (Sessão Django)
========================================================= */

const API_BASE = "https://formatura-backend-production.up.railway.app/api";

/* -------------------------
   Utils
------------------------- */
function qs(sel) { return document.querySelector(sel); }

function moneyBRL(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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

/* -------------------------
   LOGIN
------------------------- */
function login() {
  const form = qs("#loginForm");
  const cpfInput = qs("#cpf");
  const passInput = qs("#password");
  const msg = qs("#loginMsg");
  const btn = qs("#btnLogin");

  cpfInput?.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "is-info", "");

    const cpf = onlyDigits(cpfInput.value);
    const password = passInput.value;

    if (!cpf || !password) {
      setMsg(msg, "is-error", "Preencha CPF e senha.");
      return;
    }

    if (cpf.length !== 11) {
      setMsg(msg, "is-error", "CPF inválido.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cpf,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        window.location.href = "./aluno.html";
      } else {
        setMsg(msg, "is-error", data.error || "CPF ou senha inválidos.");
      }

    } catch {
      setMsg(msg, "is-error", "Erro de conexão.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
}

/* -------------------------
   DASHBOARD
------------------------- */
async function loadDashboard() {
  let me;

  try {
    const resMe = await fetch(`${API_BASE}/me/`, {
      credentials: "include"
    });

    me = await resMe.json();

    if (!resMe.ok || !me.ok) {
  console.log("Falha no /me:", me);
  return;
}

  } catch (e) {
  console.log("Erro autenticação:", e);
  return;
}

  let payload;

  try {
    const res = await fetch(`${API_BASE}/dashboard/`, {
      credentials: "include"
    });

    payload = await res.json();

    if (!res.ok) {
      throw new Error("Erro dashboard");
    }

  } catch {
    console.log("Erro carregando dashboard");
    return;
  }

  qs("#studentName").textContent = payload.student.name;
  qs("#studentClass").textContent = payload.student.turma;

  qs("#totalValue").textContent = moneyBRL(payload.contract.plan_total);
  qs("#paidValue").textContent = moneyBRL(payload.contract.paid_total);
  qs("#remainingValue").textContent = moneyBRL(payload.contract.remaining_total);

  const percent = Number(payload.contract.progress_percent || 0);
  qs("#progressText").textContent = `${percent}%`;
  qs("#progressBar").style.width = `${percent}%`;

  const btnLogout = qs("#btnLogout");
  btnLogout?.addEventListener("click", async () => {
    await fetch(`${API_BASE}/logout/`, {
      method: "POST",
      credentials: "include"
    });
    window.location.href = "./login.html";
  });
}

/* Expor global */
window.login = login;
window.loadDashboard = loadDashboard;
