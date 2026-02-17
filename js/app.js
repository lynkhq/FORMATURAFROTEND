/* =========================================================
   app.js — JS puro (sem frameworks) com mocks de API via fetch
   Funções solicitadas:
   - login()
   - loadDashboard()
   - renderInvoices()
   - createPayment()
========================================================= */

/* -------------------------
   Utils / Helpers
------------------------- */
const API_BASE = "http://127.0.0.1:8000/api";


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

/* Validação básica de CPF (algoritmo oficial dos dígitos verificadores) */
function isValidCPF(cpf) {
  const c = onlyDigits(cpf);
  if (!c || c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false; // todos iguais

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

/* -------------------------
   Mock API (fetch wrapper)
   Mantém compatível com integração futura (Django)
------------------------- */

    return {
      ok: false,
      status: 401,
      json: async () => ({ message: "CPF ou senha inválidos. Verifique e tente novamente." })
    };
  }

  if (url === "/api/dashboard" && method === "GET") {
    const session = getSession();
    if (!session?.token) {
      return { ok: false, status: 401, json: async () => ({ message: "Não autenticado." }) };
    }

    const invoices = MOCK_DB.student.invoices;
    const total = MOCK_DB.student.total;
    const paid = invoices
      .filter(i => i.status === "Pago")
      .reduce((acc, i) => acc + i.valor, 0);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        student: {
          name: MOCK_DB.student.name,
          turma: MOCK_DB.student.turma
        },
        plan: {
          name: MOCK_DB.student.planName,
          total,
          paid,
          remaining: Math.max(total - paid, 0)
        },
        invoices
      })
    };
  }

  if (url === "/api/payments/create" && method === "POST") {
    const session = getSession();
    if (!session?.token) {
      return { ok: false, status: 401, json: async () => ({ message: "Não autenticado." }) };
    }

    const invoice = body?.invoice; // {parcela, valor, vencimento}
    if (!invoice?.parcela) {
      return { ok: false, status: 400, json: async () => ({ message: "Fatura inválida." }) };
    }

    // mock payload de pagamento
    return {
      ok: true,
      status: 201,
      json: async () => ({
        paymentId: "pay_" + Math.random().toString(16).slice(2),
        pixCopyPaste:
          "00020126580014BR.GOV.BCB.PIX0136mock-chave-pix-formatura-ideal-1234567890" +
          "5204000053039865406" + String(invoice.valor).replace(".", "") +
          "5802BR5920FORMatura IDEAL LTDA6009SAO PAULO62140510mockTxId6304ABCD",
        boletoUrl: "https://example.com/boleto/mock-formatura-ideal",
        qrSvg: buildMockQrSvg()
      })
    };
  }

  // fallback
  return {
    ok: false,
    status: 404,
    json: async () => ({ message: "Rota não encontrada (mock)." })
  };
}


/* -------------------------
   Página Login
------------------------- */
function convertPasswordToDate(ddmmyyyy) {
  const d = ddmmyyyy.slice(0,2);
  const m = ddmmyyyy.slice(2,4);
  const y = ddmmyyyy.slice(4,8);
  return `${y}-${m}-${d}`;
}


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

  // máscara CPF automática
  cpfInput?.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  // limitar senha para dígitos
  passInput?.addEventListener("input", (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 8);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "is-info", "");
    const cpf = cpfInput.value;
    const password = passInput.value;

    // validações
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

    // UI loading
    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      // Mantém fetch() para integração futura. Aqui usamos apiFetch como mock.
      const res = await fetch(`${API_BASE}/login/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    cpf: onlyDigits(cpf),
    birth_date: convertPasswordToDate(password)
  })
});


      const data = await res.json();
       
   if (res.ok && data.ok) {
  setSession({
    student_id: data.student_id,
    student_name: data.student_name,
    turma: data.turma
  });

  window.location.href = "./aluno.html";
} else {
  setMsg(msg, "is-error", data.error || "Erro ao fazer login.");
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
  if (!session?.token) {
    window.location.href = "./login.html";
    return;
  }

  const btnLogout = qs("#btnLogout");
  btnLogout?.addEventListener("click", () => {
    clearSession();
    window.location.href = "./login.html";
  });

  // Busca dados do painel
let payload;
try {
  const session = getSession();
  const studentId = session?.student_id;

  if (!studentId) {
    throw new Error("Sessão inválida.");
  }

  const res = await fetch(`http://127.0.0.1:8000/api/dashboard/${studentId}/`);

  payload = await res.json();

  if (!res.ok) {
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

  // Resumo
  qs("#planName").textContent = payload.plan.name;
  qs("#totalValue").textContent = moneyBRL(payload.plan.total);
  qs("#paidValue").textContent = moneyBRL(payload.plan.paid);
  qs("#remainingValue").textContent = moneyBRL(payload.plan.remaining);

  const percent = payload.plan.total > 0
    ? Math.round((payload.plan.paid / payload.plan.total) * 100)
    : 0;

  qs("#paidPercentPill").innerHTML = `Quitado: <strong>${percent}%</strong>`;
  qs("#progressText").textContent = `${percent}%`;

  // anima a barra (pequeno delay para transição)
  requestAnimationFrame(() => {
    setTimeout(() => {
      qs("#progressBar").style.width = `${percent}%`;
    }, 80);
  });

  // Fatura atual: pega a primeira em Aberto, senão a última Pago
  const invoices = payload.invoices || [];
  const current = invoices.find(i => i.status !== "Pago") || invoices[invoices.length - 1];

  renderCurrentInvoice(current);
  renderInvoices(invoices);

  // Botão pagar agora
  const btnPay = qs("#btnPayNow");
  const payMsg = qs("#payMsg");

  if (current?.status === "Pago") {
    btnPay.disabled = true;
    setMsg(payMsg, "is-info", "Sua fatura atual já está paga.");
  } else {
    btnPay.disabled = false;
    setMsg(payMsg, "is-info", "");
  }

  btnPay?.addEventListener("click", async () => {
    if (!current) return;
    await createPayment(current);
  });

  // Modal close handlers
  wireModalClose();
}

function renderCurrentInvoice(inv) {
  const box = qs("#currentInvoice");
  const badge = qs("#currentStatusBadge");

  if (!inv || !box) return;

  // badge
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
   Criar pagamento + modal
------------------------- */
async function createPayment(currentInvoice) {
  const payMsg = qs("#payMsg");
  const btnPay = qs("#btnPayNow");
  setMsg(payMsg, "is-info", "");

  btnPay.disabled = true;
  btnPay.textContent = "Gerando pagamento...";

  try {
    const res = await apiFetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice: currentInvoice })
    });

    const data = await res.json();

    if (!res.ok) {
      setMsg(payMsg, "is-error", data.message || "Erro ao criar pagamento.");
      return;
    }

    // Preenche modal
    qs("#pixCode").value = data.pixCopyPaste || "";
    qs("#boletoLink").href = data.boletoUrl || "#";
    qs("#qrBox").innerHTML = data.qrSvg || buildMockQrSvg();

    qs("#payMeta").innerHTML = `
      <div><span class="muted">Parcela:</span> <strong>${currentInvoice.parcela}/${currentInvoice.totalParcelas}</strong></div>
      <div><span class="muted">Valor:</span> <strong>${moneyBRL(currentInvoice.valor)}</strong></div>
      <div><span class="muted">Vencimento:</span> <strong>${currentInvoice.vencimento}</strong></div>
      <div><span class="muted">ID:</span> <strong>${data.paymentId}</strong></div>
    `;

    // copiar pix
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

