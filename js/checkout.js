(function () {
  const {
    qs,
    setMsg,
    moneyBRL,
    apiFetch,
    getToken,
    clearToken
  } = window.API;

  const btnLogout = qs("#btnLogout");
  btnLogout?.addEventListener("click", () => {
    clearToken();
    window.location.href = "./login.html";
  });

  // exige token
  if (!getToken()) {
    window.location.href = "./login.html";
    return;
  }

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

  let currentMax = 0;
  let currentPlan = null;
  let currentInstallments = 0;
  let previewOk = false;

  function setConfirmEnabled(enabled) {
    btnPix.disabled = !enabled;
    btnCard.disabled = !enabled;
  }

  function renderPreviewRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      previewTbody.innerHTML = `<tr><td colspan="3" class="muted">Sem dados de preview.</td></tr>`;
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

  async function loadPlan() {
    setMsg(previewMsg, "is-info", "");
    setMsg(confirmMsg, "is-info", "");
    previewBadge.className = "badge badge-info";
    previewBadge.textContent = "Carregando...";

    installmentsSelect.disabled = true;
    setConfirmEnabled(false);

    try {
      const data = await apiFetch("/plan/for-student/", { method: "GET" });

      // Aceita formatos:
      // { total, due_day, max_installments, ... }
      // { ok:true, plan:{...} }
      currentPlan = data?.plan || data;

      const total = currentPlan?.total ?? currentPlan?.plan_total ?? currentPlan?.value_total ?? 0;
      const dueDay = currentPlan?.due_day ?? currentPlan?.dueDay ?? currentPlan?.vencimento_dia ?? "—";
      const maxInstallments = Number(currentPlan?.max_installments ?? currentPlan?.maxInstallments ?? currentPlan?.installments_max ?? 1);

      currentMax = maxInstallments;

      titleEl.textContent = "Plano";
      subtitleEl.textContent = "Escolha parcelas e método";
      planNameEl.textContent = currentPlan?.name || `Plano da turma`;
      planTotalEl.textContent = moneyBRL(total);
      planDueDayEl.textContent = String(dueDay);
      planMaxInstallmentsEl.textContent = String(maxInstallments);
      planPillEl.textContent = `Máx: ${maxInstallments}x`;

      fillInstallmentsOptions(maxInstallments);
      installmentsSelect.disabled = false;

      previewBadge.className = "badge badge-info";
      previewBadge.textContent = "Selecione parcelas";
    } catch (err) {
      // se token expirou
      if (err.status === 401) {
        clearToken();
        window.location.href = "./login.html";
        return;
      }
      previewBadge.className = "badge badge-danger";
      previewBadge.textContent = "Erro";
      setMsg(previewMsg, "is-error", err.message || "Erro ao carregar plano.");
    } finally {
      // nada
    }
  }

  async function loadPreview(installments) {
    previewOk = false;
    setConfirmEnabled(false);
    setMsg(previewMsg, "is-info", "");
    setMsg(confirmMsg, "is-info", "");

    if (!installments || Number(installments) < 1) {
      previewBadge.className = "badge badge-info";
      previewBadge.textContent = "Selecione parcelas";
      renderPreviewRows([]);
      return;
    }

    previewBadge.className = "badge badge-info";
    previewBadge.textContent = "Carregando preview...";
    installmentsSelect.disabled = true;

    try {
      const data = await apiFetch("/contract/preview/", {
        method: "POST",
        body: JSON.stringify({ installments: Number(installments) }),
      });

      if (data?.ok === false) {
        throw new Error(data?.error || "Não foi possível gerar preview.");
      }

      const schedule =
        data?.schedule ||
        data?.invoices ||
        data?.installments_schedule ||
        data?.preview ||
        [];

      renderPreviewRows(schedule);

      previewOk = true;
      previewBadge.className = "badge badge-success";
      previewBadge.textContent = "Preview OK";

      // Bloqueia confirmar se inválido (requisito)
      setConfirmEnabled(true);
    } catch (err) {
      previewBadge.className = "badge badge-danger";
      previewBadge.textContent = "Erro";
      setMsg(previewMsg, "is-error", err.message || "Erro ao gerar preview.");
      renderPreviewRows([]);
    } finally {
      installmentsSelect.disabled = false;
    }
  }

  async function confirmContract(payment_method) {
    setMsg(confirmMsg, "is-info", "");
    setMsg(previewMsg, "is-info", "");

    // Bloquear “Confirmar” se inválido (requisito)
    if (!previewOk || !currentInstallments) {
      setMsg(confirmMsg, "is-error", "Selecione parcelas e aguarde o preview ficar OK antes de confirmar.");
      return;
    }

    btnPix.disabled = true;
    btnCard.disabled = true;
    const prevTextPix = btnPix.textContent;
    const prevTextCard = btnCard.textContent;
    btnPix.textContent = "Processando...";
    btnCard.textContent = "Processando...";

    try {
      const data = await apiFetch("/contract/confirm/", {
        method: "POST",
        body: JSON.stringify({
          installments: Number(currentInstallments),
          payment_method
        }),
      });

      if (data?.ok === false) {
        throw new Error(data?.error || "Não foi possível confirmar contrato.");
      }

      const contractId =
        data?.contract_id ||
        data?.contractId ||
        data?.id ||
        data?.contract?.id ||
        "";

      if (!contractId) {
        setMsg(confirmMsg, "is-success", "Contrato confirmado! (sem contract_id na resposta)");
      } else {
        localStorage.setItem("fi_contract_id", String(contractId));
        setMsg(confirmMsg, "is-success", `Contrato confirmado! contract_id: ${contractId}`);
      }

      // Redireciona (placeholder)
      if (payment_method === "pix") window.location.href = "./pix.html";
      else window.location.href = "./card.html";

    } catch (err) {
      if (err.status === 401) {
        clearToken();
        window.location.href = "./login.html";
        return;
      }
      setMsg(confirmMsg, "is-error", err.message || "Erro ao confirmar contrato.");
      setConfirmEnabled(previewOk);
    } finally {
      btnPix.textContent = prevTextPix;
      btnCard.textContent = prevTextCard;
      btnPix.disabled = !previewOk;
      btnCard.disabled = !previewOk;
    }
  }

  installmentsSelect?.addEventListener("change", async (e) => {
    const v = Number(e.target.value || 0);
    currentInstallments = v;
    await loadPreview(v);
  });

  btnPix?.addEventListener("click", () => confirmContract("pix"));
  btnCard?.addEventListener("click", () => confirmContract("card"));

  // init
  loadPlan();
})();