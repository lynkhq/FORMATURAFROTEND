/* =========================================================
   aluno.js — Painel do Aluno (compatível com aluno.html atual)
   - Usa SESSION (fi_session) do api.js
   - Chama:
     GET  /api/dashboard/<student_id>/
     POST /api/invoices/<invoice_id>/pay/   { method: "pix" | "boleto" }

   Observação:
   - NÃO usa token/JWT
   - Só precisa do student_id salvo no localStorage
========================================================= */

(function () {
  const {
    qs,
    setMsg: setMsgAPI,
    moneyBRL,
    apiFetch,
    clearSession,
    requireLogin,
    getSession,
  } = window.API || {};

  // Se api.js não carregou, não tem como continuar
  if (!window.API) {
    alert("Erro: api.js não carregou.");
    return;
  }

  // Exige sessão (student_id)
  const session = requireLogin();
  if (!session) return;

  // -------- Elements (IDs do seu aluno.html) --------
  const elStudentName = qs("#studentName");
  const elStudentClass = qs("#studentClass");
  const elStatusChip = qs("#statusChip");

  const elKpiTotal = qs("#kpiTotal");
  const elKpiPaid = qs("#kpiPaid");
  const elKpiRemaining = qs("#kpiRemaining");

  const elDashMsg = qs("#dashMsg");
  const elInvoicesBody = qs("#invoicesBody");

  const btnLogout = qs("#btnLogout");
  const btnPayNow = qs("#btnPayNow");

  // Modal
  const modal = qs("#payModal");
  const btnPayPix = qs("#btnPayPix");
  const btnPayBoleto = qs("#btnPayBoleto");
  const elPayMsg = qs("#payMsg");
  const elPixCopy = qs("#pixCopy");
  const btnCopyPix = qs("#btnCopyPix");
  const elQrBox = qs("#qrBox");
  const elBoletoLink = qs("#boletoLink");
  const elPayMeta = qs("#payMeta");

  // -------- Helpers --------
  function setMsg(el, type, text) {
    // Usa o setMsg do api.js (ele aplica classes is-error/is-success/is-info)
    // Caso o elemento não esteja no formato esperado, ainda mostra texto.
    try {
      setMsgAPI(el, type, text);
    } catch {
      if (!el) return;
      el.textContent = text || "";
    }
  }

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function fmtBRDate(yyyy_mm_dd) {
    const s = String(yyyy_mm_dd || "");
    const parts = s.split("-");
    if (parts.length !== 3) return s || "—";
    const [y, m, d] = parts;
    if (!y || !m || !d) return s || "—";
    return `${d}/${m}/${y}`;
  }

  function mapStatus(status) {
    const st = String(status || "").toLowerCase();
    if (st === "paid") return "Pago";
    if (st === "overdue") return "Atrasado";
    return "Aberto";
  }

  function buildQrImgFromBase64(base64) {
    if (!base64) return `<div class="muted">QR não disponível.</div>`;
    return `<img alt="QR Code Pix" style="max-width:220px; width:220px; height:220px;" src="data:image/png;base64,${base64}" />`;
  }

  function pickNextInvoice(invoices) {
    // Próxima = primeira que NÃO está paga (prioriza atrasado/open)
    const list = Array.isArray(invoices) ? invoices : [];
    const next =
      list.find((i) => String(i?.status).toLowerCase() === "overdue") ||
      list.find((i) => String(i?.status).toLowerCase() === "open") ||
      null;
    return next;
  }

  function renderInvoices(invoices, totalInstallments) {
    if (!elInvoicesBody) return;

    const list = Array.isArray(invoices) ? invoices : [];
    if (list.length === 0) {
      elInvoicesBody.innerHTML = `<tr><td colspan="4" class="muted">Nenhuma parcela encontrada.</td></tr>`;
      return;
    }

    elInvoicesBody.innerHTML = list
      .map((inv) => {
        const number = inv?.number ?? inv?.parcela ?? "—";
        const due = fmtBRDate(inv?.due_date ?? inv?.vencimento);
        const value = Number(inv?.value ?? inv?.valor ?? 0);
        const stLabel = mapStatus(inv?.status);

        // class opcional (se seu css tiver)
        const cls =
          stLabel === "Pago"
            ? "row-paid"
            : stLabel === "Atrasado"
              ? "row-late"
              : "row-open";

        return `
          <tr class="${cls}">
            <td>${number}${totalInstallments ? `/${totalInstallments}` : ""}</td>
            <td>${due}</td>
            <td>${moneyBRL(value)}</td>
            <td>${stLabel}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadDashboard() {
    setMsg(elDashMsg, "is-info", "");
    if (elStatusChip) elStatusChip.textContent = "Carregando…";
    if (btnPayNow) btnPayNow.disabled = true;

    try {
      const sid = getSession()?.student_id;
      if (!sid) {
        clearSession();
        window.location.href = "./login.html";
        return;
      }

      // ✅ Seu endpoint é /api/dashboard/<student_id>/
      const data = await apiFetch(`/dashboard/${encodeURIComponent(sid)}/`, { method: "GET" });

      if (!data?.ok) {
        setMsg(elDashMsg, "is-error", data?.error || "Não foi possível carregar o painel.");
        if (elStatusChip) elStatusChip.textContent = "Erro";
        return;
      }

      // Header
      const studentName = data?.student?.name || session?.student_name || "Aluno";
      const turma = data?.student?.turma || session?.turma || "—";
      if (elStudentName) elStudentName.textContent = studentName;
      if (elStudentClass) elStudentClass.textContent = turma;

      // KPIs
      const planTotal = Number(data?.contract?.plan_total ?? 0);
      const paidTotal = Number(data?.contract?.paid_total ?? 0);
      const remainingTotal = Number(data?.contract?.remaining_total ?? Math.max(0, planTotal - paidTotal));

      if (elKpiTotal) elKpiTotal.textContent = moneyBRL(planTotal);
      if (elKpiPaid) elKpiPaid.textContent = moneyBRL(paidTotal);
      if (elKpiRemaining) elKpiRemaining.textContent = moneyBRL(remainingTotal);

      // Status chip
      const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
      const next = pickNextInvoice(invoices);

      if (elStatusChip) {
        if (!next) elStatusChip.textContent = "Tudo em dia ✅";
        else elStatusChip.textContent = `Próxima: ${mapStatus(next.status)}`;
      }

      // Tabela
      const totalInstallments = Number(data?.contract?.installments ?? invoices.length ?? 0);
      renderInvoices(invoices, totalInstallments);

      // Botão "Pagar próxima"
      if (btnPayNow) {
        if (!next) {
          btnPayNow.disabled = true;
          btnPayNow.textContent = "Pagar próxima";
          setMsg(elDashMsg, "is-success", "Nenhuma fatura em aberto no momento.");
        } else {
          btnPayNow.disabled = false;
          btnPayNow.textContent = `Pagar parcela ${next.number ?? ""}`.trim();
          btnPayNow.onclick = () => openPayment(next, turma);
        }
      }
    } catch (err) {
      // Se veio HTML (Not Found), normalmente é URL errada no API_BASE
      const raw = String(err?.message || "");
      const clean =
        raw.includes("<!doctype") || raw.includes("<html")
          ? "Endpoint não encontrado (verifique API_BASE e rotas do backend)."
          : raw;

      setMsg(elDashMsg, "is-error", clean || "Falha ao carregar painel.");
      if (elStatusChip) elStatusChip.textContent = "Erro";
      if (btnPayNow) btnPayNow.disabled = true;
    }
  }

  function openPayment(invoice, turma) {
    // limpa UI do modal
    setMsg(elPayMsg, "is-info", "");
    if (elPixCopy) elPixCopy.value = "";
    if (elQrBox) elQrBox.innerHTML = `<div class="muted">Gere um Pix para ver o QR.</div>`;
    if (elBoletoLink) {
      elBoletoLink.href = "#";
      elBoletoLink.style.pointerEvents = "none";
      elBoletoLink.style.opacity = ".6";
    }
    if (elPayMeta) {
      elPayMeta.innerHTML = `
        <div><span class="muted">Turma:</span> <strong>${turma || "—"}</strong></div>
        <div><span class="muted">Parcela:</span> <strong>${invoice?.number ?? invoice?.id ?? "—"}</strong></div>
        <div><span class="muted">Vencimento:</span> <strong>${fmtBRDate(invoice?.due_date)}</strong></div>
        <div><span class="muted">Valor:</span> <strong>${moneyBRL(invoice?.value)}</strong></div>
      `;
    }

    // handlers
    btnPayPix.onclick = () => createPayment(invoice, "pix");
    btnPayBoleto.onclick = () => createPayment(invoice, "boleto");

    btnCopyPix.onclick = async () => {
      const text = elPixCopy?.value || "";
      if (!text) {
        setMsg(elPayMsg, "is-error", "Não há código Pix para copiar.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        setMsg(elPayMsg, "is-success", "Código Pix copiado!");
      } catch {
        setMsg(elPayMsg, "is-error", "Não consegui copiar automaticamente. Copie manualmente.");
      }
    };

    openModal();
  }

  async function createPayment(invoice, method) {
    if (!invoice?.id) {
      setMsg(elPayMsg, "is-error", "Fatura inválida (sem id).");
      return;
    }

    setMsg(elPayMsg, "is-info", "Gerando pagamento...");

    btnPayPix.disabled = true;
    btnPayBoleto.disabled = true;

    try {
      // ✅ No seu backend: /api/invoices/<invoice_id>/pay/ (com barra no final)
      const data = await apiFetch(`/invoices/${encodeURIComponent(invoice.id)}/pay/`, {
        method: "POST",
        body: JSON.stringify({ method }),
      });

      if (!data?.ok) {
        setMsg(elPayMsg, "is-error", data?.error || "Erro ao gerar pagamento.");
        return;
      }

      // PIX
      const pixCopyPaste = data?.pix_copia_cola || "";
      const pixQrBase64 = data?.pix_qr_base64 || "";

      if (elPixCopy) elPixCopy.value = pixCopyPaste;
      if (elQrBox) {
        elQrBox.innerHTML = pixQrBase64
          ? buildQrImgFromBase64(pixQrBase64)
          : `<div class="muted">QR não disponível.</div>`;
      }

      // BOLETO
      const boletoUrl = data?.boleto_url || "";
      if (elBoletoLink) {
        elBoletoLink.href = boletoUrl || "#";
        elBoletoLink.style.pointerEvents = boletoUrl ? "auto" : "none";
        elBoletoLink.style.opacity = boletoUrl ? "1" : ".6";
      }

      setMsg(elPayMsg, "is-success", "Pagamento gerado com sucesso!");
    } catch (err) {
      setMsg(elPayMsg, "is-error", err?.message || "Falha ao gerar pagamento.");
    } finally {
      btnPayPix.disabled = false;
      btnPayBoleto.disabled = false;
    }
  }

  // -------- Wire events --------
  btnLogout?.addEventListener("click", () => {
    clearSession();
    window.location.href = "./login.html";
  });

  modal?.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.dataset?.close === "true") closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
  });

  // Init
  loadDashboard();
})();
