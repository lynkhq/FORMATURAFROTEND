// register.js (compatível com seu form atual)
(function () {
  const { qs, formatCPF, onlyDigits, setMsg, apiFetch } = window.API;

  const form = qs("#registerForm");
  const msg = qs("#registerMsg");
  const btn = qs("#btnRegister");

  const cpfInput = qs("#cpf");
  cpfInput?.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  function toISODate(input) {
    // Aceita:
    // - "YYYY-MM-DD" (já ok)
    // - "DD/MM/YYYY" (converte)
    const v = String(input || "").trim();
    if (!v) return "";

    // já está no formato ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    // BR -> ISO
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dd = m[1], mm = m[2], yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    return ""; // inválido
  }

  function friendlyBackendError(err) {
    // apiFetch joga Error(msg) e coloca err.data e err.status
    const data = err?.data;

    if (data?.error) return data.error;

    // serializer errors: { ok:false, errors: { campo: ["msg"] } }
    if (data?.errors && typeof data.errors === "object") {
      const parts = [];
      for (const [field, msgs] of Object.entries(data.errors)) {
        if (Array.isArray(msgs)) parts.push(`${field}: ${msgs.join(", ")}`);
        else parts.push(`${field}: ${String(msgs)}`);
      }
      if (parts.length) return parts.join(" • ");
    }

    // DRF padrão
    if (data?.detail) return data.detail;

    // fallback
    const raw = String(err?.message || "");
    if (raw.includes("<!doctype") || raw.includes("<html")) {
      return "Resposta inesperada do servidor (HTML). Verifique o endpoint /api/register/.";
    }
    return raw || "Falha de conexão. Tente novamente.";
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "is-info", "");

    const student_name = qs("#student_name")?.value?.trim() || "";
    const cpf = onlyDigits(qs("#cpf")?.value);
    const birth_date_raw = qs("#birth_date")?.value?.trim() || "";
    const responsible_name = qs("#responsible_name")?.value?.trim() || "";
    const turma = qs("#turma")?.value?.trim() || ""; // agora é select
    const email = qs("#email")?.value?.trim() || "";
    const password = qs("#password")?.value || "";
    const confirm_password = qs("#confirm_password")?.value || "";

    const birth_date = toISODate(birth_date_raw);

    // validações básicas (UI)
    if (!student_name || !cpf || !birth_date || !responsible_name || !turma || !email) {
      setMsg(msg, "is-error", "Preencha todos os campos obrigatórios.");
      return;
    }
    if (cpf.length !== 11) {
      setMsg(msg, "is-error", "CPF inválido.");
      return;
    }
    if (!birth_date) {
      setMsg(msg, "is-error", "Data de nascimento inválida. Use DD/MM/AAAA ou AAAA-MM-DD.");
      return;
    }
    if (!password || password.length < 6) {
      setMsg(msg, "is-error", "Senha muito curta (mínimo 6 caracteres).");
      return;
    }
    if (password !== confirm_password) {
      setMsg(msg, "is-error", "As senhas não coincidem.");
      return;
    }

    const payload = {
      student_name,
      cpf,
      birth_date,          // ✅ ISO pro backend
      responsible_name,
      turma,               // ✅ exatamente a opção do select
      email,
      password,
      confirm_password,
    };

    btn.disabled = true;
    btn.textContent = "Cadastrando...";

    try {
      const data = await apiFetch("/register/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (data?.ok === false) {
        setMsg(msg, "is-error", data?.error || "Erro ao cadastrar.");
        return;
      }

      setMsg(msg, "is-success", "Cadastro criado com sucesso! Redirecionando para login...");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 800);
    } catch (err) {
      setMsg(msg, "is-error", friendlyBackendError(err));
    } finally {
      btn.disabled = false;
      btn.textContent = "Criar conta";
    }
  });
})();
