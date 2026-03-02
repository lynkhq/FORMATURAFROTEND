(function () {
  const {
    qs,
    setMsg,
    moneyBRL,
    apiFetch,
    clearSession,
    requireLogin,
    getSession,
  } = window.API;

  // exige sessão
  const session = requireLogin();
  if (!session) return;

  const btnLogout = qs("#btnLogout");
  btnLogout?.addEventListener("click", () => {
    clearSession();
    window.location.href = "./login.html";
  });

  const planNameEl = qs("#planName");
  const planTotalEl = qs("#planTotal");
  const planDueDayEl = qs("#planDueDay");
  const planMaxInstallmentsEl = qs("#planMaxInstallments");
  const planPillEl = qs("#planPill");
  const titleEl = qs("#checkoutTitle");
  const subtitleEl = qs("#checkoutSubtitle");

  const installmentsSelect = qs("#installments");
  const previewMsg = qs("#previewMsg");
  const previewBadge = qs("#previewBadge");
  const previewTbody = qs("#previewTable tbody");

  const btnPix = qs("#btnPix");
  const btnCard = qs("#btnCard");
  const confirmMsg = qs("#confirmMsg");

  function setConfirmEnabled(enabled) {
    btnPix.disabled = !enabled;
    btnCard.disabled = !enabled;
  }

  function renderPreviewRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      previewTbody.innerHTML = `<tr><td colspan="3" class="muted">Sem dados para exibir.</td></tr>`;
      return;
    }

    previewTbody.innerHTML = rows.map((r, idx) => {
      const parcela = r?.installment ?? r?.number ?? (idx + 1);
      const due = r?.due_date ?? r?.dueDate ?? r?.vencimento ?? "—";
      const value = r?.value ?? r?.amount ?? r?.valor ?? 0;
      return `
        <tr>
          <td>${parcela}</td>
          <td>${due}</td>
          <td>${moneyBRL(value)}</td>
        </tr>
      `;
    }).join("");
  }

  function fillInstallmentsOptions(max) {
    installmentsSelect.innerHTML = `<option value="">Selecione...</option>`;
    for (let i = 1; i <= max; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${i}x`;
      installmentsSelect.appendChild(opt);
    }
  }

  // ✅ Carrega tudo via /dashboard/<student_id>/
  async function loadDashboardAndPlan() {
    setMsg(previewMsg, "is-info", "");
    setMsg(confirmMsg, "is-info", "");
    setConfirmEnabled(false);

    previewBadge.className = "badge badge-info";
    previewBadge.textContent = "Carregando...";

    installmentsSelect.disabled = true;

    try {
      const sid = getSession()?.student_id;
      if (!sid) throw new Error("Sessão inválida. Faça login novamente.");

      // ✅ endpoint que EXISTE no seu backend
      const data = await apiFetch(`/dashboard/${sid}/`, { method: "GET" });

      if (!data?.ok) throw new Error(data?.error || "Erro ao carregar dashboard.");

      // "Plano" vem indireto do contract (plan_total, installments etc)
      const contract = data.contract || {};
      const student = data.student || {};
      const invoices = Array.isArray(data.invoices) ? data.invoices : [];

      titleEl.textContent = "Plano";
      subtitleEl.textContent = "Escolha parcelas e gere pagamento";

      planNameEl.textContent = `Plano da turma ${student?.turma || ""}`.trim() || "Plano";
      planTotalEl.textContent = moneyBRL(contract?.plan_total ?? 0);

      // Due day não vem no dashboard hoje → mostramos "—"
      planDueDayEl.textContent = "—";

      const maxInstallments = Number(contract?.installments ?? invoices.length ?? 1) || 1;
      planMaxInstallmentsEl.textContent = String(maxInstallments);
      planPillEl.textContent = `Máx: ${maxInstallments}x`;

      fillInstallmentsOptions(maxInstallments);
      installmentsSelect.disabled = false;

      // Preview: usa as invoices do dashboard
      // (você pode mostrar tudo ou filtrar pelo número de parcelas)
      previewBadge.className = "badge badge-success";
      previewBadge.textContent = "Carregado";

      // já mostra a tabela completa (melhor do que “preview” que não existe)
      renderPreviewRows(invoices.map(inv => ({
        number: inv.number,
        due_date: inv.due_date,
        value: inv.value,
      })));

      // habilita botões de pagamento se tiver pelo menos 1 invoice aberta
      const openInv = invoices.find(i => String(i.status || "").toLowerCase() !== "paid");
      if (!openInv) {
        setMsg(confirmMsg, "is-info", "Nenhuma fatura em aberto encontrada.");
        setConfirmEnabled(false);
      } else {
        setMsg(confirmMsg, "is-info", "Escolha um método para gerar o pagamento da próxima parcela em aberto.");
        setConfirmEnabled(true);
      }

    } catch (err) {
      previewBadge.className = "badge badge-danger";
      previewBadge.textContent = "Erro";

      const raw = String(err?.message || "");
      const clean =
        raw.includes("<!doctype") || raw.includes("<html")
          ? "Endpoint não encontrado (verifique rotas do backend)."
          : raw;

      setMsg(previewMsg, "is-error", clean || "Erro ao carregar dados.");
      renderPreviewRows([]);
      setConfirmEnabled(false);
    }
  }

  // ✅ Gera pagamento usando a primeira invoice em aberto
  async function payNextOpenInvoice(method) {
    setMsg(confirmMsg, "is-info", "");

    btnPix.disabled = true;
    btnCard.disabled = true;
    const prevTextPix = btnPix.textContent;
    const prevTextCard = btnCard.textContent;
    btnPix.textContent = "Processando...";
    btnCard.textContent = "Processando...";

    try {
      const sid = getSession()?.student_id;
      const dash = await apiFetch(`/dashboard/${sid}/`, { method: "GET" });

      const invoices = Array.isArray(dash?.invoices) ? dash.invoices : [];
      const openInv = invoices.find(i => String(i.status || "").toLowerCase() !== "paid");

      if (!openInv?.id) {
        setMsg(confirmMsg, "is-error", "Nenhuma fatura em aberto para pagar.");
        return;
      }

      // ✅ endpoint que existe: /api/invoices/<id>/pay/
      const pay = await apiFetch(`/invoices/${openInv.id}/pay/`, {
        method: "POST",
        body: JSON.stringify({ method }), // "pix" | "boleto"
      });

      if (!pay?.ok) throw new Error(pay?.error || "Não foi possível gerar pagamento.");

      // Salva infos pra próxima tela (se você tiver pix.html / boleto.html)
      localStorage.setItem("fi_last_payment", JSON.stringify(pay));

      setMsg(confirmMsg, "is-success", "Pagamento gerado! Abrindo tela...");

      if (method === "pix") window.location.href = "./pix.html";
      else window.location.href = "./boleto.html"; // se não existir, troque ou remova

    } catch (err) {
      const raw = String(err?.message || "");
      const clean =
        raw.includes("<!doctype") || raw.includes("<html")
          ? "Erro: rota não encontrada no backend."
          : raw;

      setMsg(confirmMsg, "is-error", clean || "Erro ao gerar pagamento.");
    } finally {
      btnPix.textContent = prevTextPix;
      btnCard.textContent = prevTextCard;
      btnPix.disabled = false;
      btnCard.disabled = false;
    }
  }

  installmentsSelect?.addEventListener("change", () => {
    // Como não existe preview real no backend, não fazemos nada aqui.
    // Mantemos o select só como visual.
  });

  btnPix?.addEventListener("click", () => payNextOpenInvoice("pix"));
  btnCard?.addEventListener("click", () => payNextOpenInvoice("boleto")); // você usa boleto no backend, não "card"

  // init
  loadDashboardAndPlan();
})();
