/* =========================================================
   app.js — Integração REAL (Django + PostgreSQL + Mercado Pago)
   Rotas (backend):
   - POST  http://127.0.0.1:8000/api/login/
   - GET   http://127.0.0.1:8000/api/dashboard/<student_id>/
   - POST  http://127.0.0.1:8000/api/invoices/<invoice_id>/pay   { method: "pix" | "boleto" }
========================================================= */

/* -------------------------
   Config
------------------------- */
const API_BASE = "https://formatura-backend-production.up.railway.app/api";

/* -------------------------
   Utils / Helpers
------------------------- */
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

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

/* Validação básica de CPF (dígitos verificadores) */
function isValidCPF(cpf) {
  const c = onlyDigits(cpf);
  if (!c || c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;

  const calcDV = (base) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (base.length + 1 - i);
    }
    const mod = sum % 11;
    return (mod < 2) ? 0 : 11 - mod;
  };

  const base9 = c.slice(0, 9);
  const dv1 = calcDV(base9);
  const base10 = c.slice(0, 10);
  const dv2 = calcDV(base10);

  return c === (base9 + String(dv1) + String(dv2));
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

/* Session */
const SESSION_KEY = "fi_session";

function setSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* Datas e status (backend -> UI) */
function convertPasswordToDate(ddmmyyyy) {
  const d = ddmmyyyy.slice(0, 2);
  const m = ddmmyyyy.slice(2, 4);
  const y = ddmmyyyy.slice(4, 8);
  return `${y}-${m}-${d}`;
}

function formatBRDate(yyyy_mm_dd) {
  const [y, m, d] = String(yyyy_mm_dd || "").split("-");
  if (!y || !m || !d) return yyyy_mm_dd || "";
  return `${d}/${m}/${y}`;
}

function mapStatus(status) {
  if (status === "paid") return "Pago";
  if (status === "overdue") return "Atrasado";
  return "Aberto";
}

/* -------------------------
   Página Login
------------------------- */
function login() {
  const form = qs("#loginForm");
  const cpfInput = qs("#cpf");
  const passInput = qs("#password");
  const msg = qs("#loginMsg");
  const btn = qs("#btnLogin");

  // Se já estiver logado, manda pro painel
  const session = getSession();
  if (session?.student_id) {
    window.location.href = "./aluno.html";
    return;
  }

  cpfInput?.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  passInput?.addEventListener("input", (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 8);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "is-info", "");

    const cpf = cpfInput.value;
    const password = passInput.value;

    if (!cpf || !password) {
      setMsg(msg, "is-error", "Preencha CPF e senha para continuar.");
      return;
    }
    if (!isValidCPF(cpf)) {
      setMsg(msg, "is-error", "CPF inválido. Verifique e tente novamente.");
      return;
    }
    if (onlyDigits(password).length !== 8) {
      setMsg(msg, "is-error", "A senha deve ser a data de nascimento no formato DDMMAAAA.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: onlyDigits(cpf),
          birth_date: convertPasswordToDate(password),
        }),
      });

      let data = {};
      try { data = await res.json(); } catch { data = {}; }

      if (res.ok && data.ok) {
        setSession({
          student_id: data.student_id,
          student_name: data.student_name,
          turma: data.turma,
        });

        window.location.href = "./aluno.html";
      } else {
        setMsg(msg, "is-error", data.error || "CPF ou data de nascimento inválidos.");
      }
    } catch (err) {
      setMsg(msg, "is-error", "Falha de conexão. Tente novamente.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
}

/* -------------------------
   Página Aluno (Dashboard)
------------------------- */
async function loadDashboard() {
  const session = getSession();

  if (!session?.student_id) {
    window.location.href = "./login.html";
    return;
  }

  const btnLogout = qs("#btnLogout");
  btnLogout?.addEventListener("click", () => {
    clearSession();
    window.location.href = "./login.html";
  });

  let payload;
  try {
    const res = await fetch(`${API_BASE}/dashboard/${session.student_id}/`);
    payload = await res.json();

    if (!res.ok || !payload.ok) {
      throw new Error(payload?.error || "Erro ao carregar painel.");
    }
  } catch (e) {
    clearSession();
    window.location.href = "./login.html";
    return;
  }

  // Header
  qs("#studentName").textContent = payload.student.name;
  qs("#studentClass").textContent = payload.student.turma;

  // Resumo (backend -> contract)
  qs("#planName").textContent = `Plano da turma ${payload.student.turma}`;
  qs("#totalValue").textContent = moneyBRL(payload.contract.plan_total);
  qs("#paidValue").textContent = moneyBRL(payload.contract.paid_total);
  qs("#remainingValue").textContent = moneyBRL(payload.contract.remaining_total);

  const percent = Number(payload.contract.progress_percent || 0);
  qs("#paidPercentPill").innerHTML = `Quitado: <strong>${percent}%</strong>`;
  qs("#progressText").textContent = `${percent}%`;

  requestAnimationFrame(() => {
    setTimeout(() => {
      qs("#progressBar").style.width = `${percent}%`;
    }, 80);
  });

  // Converter invoices do backend para o formato que a UI já usa
  const totalParcelas = payload.contract.installments;

  const invoices = (payload.invoices || []).map(inv => ({
    id: inv.id,
    parcela: inv.number,
    totalParcelas,
    vencimento: formatBRDate(inv.due_date),
    valor: Number(inv.value),
    status: mapStatus(inv.status),
    boleto_url: inv.boleto_url,
    pix_payload: inv.pix_payload,
  }));

  const current = invoices.find(i => i.status !== "Pago") || invoices[invoices.length - 1];

  renderCurrentInvoice(current);
  renderInvoices(invoices);

  // Botão pagar agora
  const btnPay = qs("#btnPayNow");
  const payMsg = qs("#payMsg");

  if (!current) {
    btnPay.disabled = true;
    setMsg(payMsg, "is-info", "Nenhuma fatura encontrada.");
  } else if (current.status === "Pago") {
    btnPay.disabled = true;
    setMsg(payMsg, "is-info", "Sua fatura atual já está paga.");
  } else {
    btnPay.disabled = false;
    setMsg(payMsg, "is-info", "");
  }

  btnPay?.addEventListener("click", async () => {
    if (!current) return;
    await createPayment(current, "pix"); // padrão: pix
  });

  // Modal close handlers
  wireModalClose();
}

function renderCurrentInvoice(inv) {
  const box = qs("#currentInvoice");
  const badge = qs("#currentStatusBadge");

  if (!box) return;

  if (!inv) {
    badge.className = "badge";
    badge.textContent = "—";
    box.innerHTML = "";
    return;
  }

  const map = {
    "Pago": { cls: "badge-success", label: "Pago" },
    "Aberto": { cls: "badge-info", label: "Aberto" },
    "Atrasado": { cls: "badge-danger", label: "Atrasado" }
  };
  const b = map[inv.status] || { cls: "", label: inv.status || "—" };
  badge.className = `badge ${b.cls}`.trim();
  badge.textContent = b.label;

  box.innerHTML = `
    <div class="invoice-item">
      <div class="muted">Parcela</div>
      <div class="value"><strong>${inv.parcela}/${inv.totalParcelas}</strong></div>
    </div>
    <div class="invoice-item">
      <div class="muted">Valor</div>
      <div class="value"><strong>${moneyBRL(inv.valor)}</strong></div>
    </div>
    <div class="invoice-item">
      <div class="muted">Vencimento</div>
      <div class="value"><strong>${inv.vencimento}</strong></div>
    </div>
    <div class="invoice-item">
      <div class="muted">Status</div>
      <div class="value"><strong>${inv.status}</strong></div>
    </div>
  `;
}

function renderInvoices(invoices) {
  const tbody = qs("#invoicesTable tbody");
  const count = qs("#invoiceCount");
  if (!tbody) return;

  count.textContent = `${invoices.length} parcelas`;

  tbody.innerHTML = invoices.map(inv => {
    const cls = inv.status === "Pago" ? "row-status row-paid"
      : inv.status === "Atrasado" ? "row-status row-late"
        : "row-status row-open";

    return `
      <tr>
        <td>${inv.parcela}/${inv.totalParcelas}</td>
        <td>${inv.vencimento}</td>
        <td>${moneyBRL(inv.valor)}</td>
        <td><span class="${cls}">${inv.status}</span></td>
      </tr>
    `;
  }).join("");
}

/* -------------------------
   Criar pagamento + modal (Mercado Pago)
------------------------- */
function buildQrImgFromBase64(base64) {
  if (!base64) return `<div class="muted">QR não disponível.</div>`;
  return `<img alt="QR Code Pix" style="max-width:180px; width:180px; height:180px;" src="data:image/png;base64,${base64}" />`;
}

async function createPayment(currentInvoice, method = "pix") {
  const payMsg = qs("#payMsg");
  const btnPay = qs("#btnPayNow");
  setMsg(payMsg, "is-info", "");

  btnPay.disabled = true;
  btnPay.textContent = "Gerando pagamento...";

  try {
    const res = await fetch(`${API_BASE}/invoices/${currentInvoice.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method })
    });

    let data = {};
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok || !data.ok) {
      setMsg(payMsg, "is-error", data.error || "Erro ao criar pagamento.");
      return;
    }

    // PIX
    const pixCopyPaste = data.pix_copia_cola || "";
    const pixQrBase64 = data.pix_qr_base64 || "";

    qs("#pixCode").value = pixCopyPaste;
    qs("#qrBox").innerHTML = pixQrBase64 ? buildQrImgFromBase64(pixQrBase64) : `<div class="muted">QR não disponível.</div>`;

    // BOLETO
    const boletoUrl = data.boleto_url || "";
    const boletoLink = qs("#boletoLink");
    boletoLink.href = boletoUrl || "#";
    boletoLink.style.pointerEvents = boletoUrl ? "auto" : "none";
    boletoLink.style.opacity = boletoUrl ? "1" : ".6";

    // Meta
    qs("#payMeta").innerHTML = `
      <div><span class="muted">Parcela:</span> <strong>${currentInvoice.parcela}/${currentInvoice.totalParcelas}</strong></div>
      <div><span class="muted">Valor:</span> <strong>${moneyBRL(currentInvoice.valor)}</strong></div>
      <div><span class="muted">Vencimento:</span> <strong>${currentInvoice.vencimento}</strong></div>
      <div><span class="muted">Tipo:</span> <strong>${data.type || method}</strong></div>
      <div><span class="muted">MP ID:</span> <strong>${data.mp_payment_id || "—"}</strong></div>
    `;

    // Copiar Pix
    const copyBtn = qs("#btnCopyPix");
    const copyMsg = qs("#copyMsg");

    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(qs("#pixCode").value);
        setMsg(copyMsg, "is-success", "Código Pix copiado!");
        setTimeout(() => setMsg(copyMsg, "is-info", ""), 1200);
      } catch {
        setMsg(copyMsg, "is-error", "Não foi possível copiar automaticamente. Copie manualmente.");
      }
    };

    openModal("#payModal");

  } catch (e) {
    setMsg(payMsg, "is-error", "Falha de conexão. Tente novamente.");
  } finally {
    btnPay.disabled = false;
    btnPay.textContent = "Pagar Agora";
  }
}

/* -------------------------
   Modal controls
------------------------- */
function openModal(selector) {
  const modal = qs(selector);
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(selector) {
  const modal = qs(selector);
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function wireModalClose() {
  const modal = qs("#payModal");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (target?.dataset?.close === "true") {
      closeModal("#payModal");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal("#payModal");
    }
  });
}

/* Expõe funções globalmente (login.html e aluno.html chamam direto) */
window.login = login;
window.loadDashboard = loadDashboard;

