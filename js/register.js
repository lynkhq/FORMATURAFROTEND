(function () {
  const { qs, formatCPF, onlyDigits, setMsg, apiFetch } = window.API;

  const form = qs("#registerForm");
  const msg = qs("#registerMsg");
  const btn = qs("#btnRegister");

  const cpfInput = qs("#cpf");
  cpfInput?.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "is-info", "");

    const student_name = qs("#student_name")?.value?.trim();
    const cpf = onlyDigits(qs("#cpf")?.value);
    const birth_date = qs("#birth_date")?.value; // YYYY-MM-DD (se você estiver usando input date)
    const responsible_name = qs("#responsible_name")?.value?.trim();
    const turma = qs("#turma")?.value?.trim();
    const email = qs("#email")?.value?.trim();
    const password = qs("#password")?.value || "";

    if (!student_name || !cpf || !birth_date || !responsible_name || !turma || !email || !password) {
      setMsg(msg, "is-error", "Preencha todos os campos obrigatórios.");
      return;
    }
    if (cpf.length !== 11) {
      setMsg(msg, "is-error", "CPF inválido.");
      return;
    }
    if (password.length < 6) {
      setMsg(msg, "is-error", "Senha muito curta (mínimo 6 caracteres).");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Cadastrando...";

    try {
      const payload = {
        student_name,
        cpf,
        birth_date,
        responsible_name,
        turma,
        email,
        password,

        // ✅ se o backend exigir confirm_password, enviamos igual
        confirm_password: password,
      };

      const data = await apiFetch("/register/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (data?.ok === false) {
        setMsg(msg, "is-error", data?.error || "Erro ao cadastrar.");
        return;
      }

      setMsg(msg, "is-success", "Cadastro criado com sucesso! Redirecionando para login...");
      setTimeout(() => window.location.href = "./login.html", 900);
    } catch (err) {
      // Se for 400, normalmente vem serializer.errors (mas seu apiFetch joga err.message)
      setMsg(msg, "is-error", err.message || "Falha de conexão. Tente novamente.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Criar conta";
    }
  });
})();
