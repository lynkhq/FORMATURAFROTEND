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

    const payload = {
      student_name: qs("#student_name")?.value?.trim(),
      cpf: onlyDigits(qs("#cpf")?.value),
      birth_date: qs("#birth_date")?.value, // YYYY-MM-DD
      responsible_name: qs("#responsible_name")?.value?.trim(),
      turma: qs("#turma")?.value?.trim(),
      email: qs("#email")?.value?.trim(),
      password: qs("#password")?.value,
      confirm_password: qs("#confirm_password")?.value,
    };

    // validações básicas (UI)
    if (!payload.student_name || !payload.cpf || !payload.birth_date || !payload.responsible_name || !payload.turma || !payload.email) {
      setMsg(msg, "is-error", "Preencha todos os campos obrigatórios.");
      return;
    }
    if (payload.cpf.length !== 11) {
      setMsg(msg, "is-error", "CPF inválido.");
      return;
    }
    if (!payload.password || payload.password.length < 6) {
      setMsg(msg, "is-error", "Senha muito curta (mínimo 6 caracteres).");
      return;
    }
    if (payload.password !== payload.confirm_password) {
      setMsg(msg, "is-error", "As senhas não coincidem.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Cadastrando...";

    try {
      const data = await apiFetch("/register/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Se backend usar {ok:true}
      if (data?.ok === false) {
        setMsg(msg, "is-error", data?.error || "Erro ao cadastrar.");
        return;
      }

      setMsg(msg, "is-success", "Cadastro criado com sucesso! Redirecionando para login...");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 900);
    } catch (err) {
      setMsg(msg, "is-error", err.message || "Falha de conexão. Tente novamente.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Criar conta";
    }
  });
})();