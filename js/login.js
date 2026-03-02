(function () {
  const { qs, formatCPF, onlyDigits, setMsg, apiFetch, setSession, getSession } = window.API;

  if (getSession()?.student_id) {
    window.location.href = "./aluno.html";
    return;
  }

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

    const cpf = onlyDigits(cpfInput?.value);
    const password = passInput?.value || "";

    if (!cpf || cpf.length !== 11) {
      setMsg(msg, "is-error", "CPF inválido.");
      return;
    }
    if (!password) {
      setMsg(msg, "is-error", "Digite sua senha.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const data = await apiFetch("/login/", {
        method: "POST",
        body: JSON.stringify({ cpf, password }),
      });

      if (!data?.ok || !data?.student_id) {
        setMsg(msg, "is-error", data?.error || "Login não autorizado.");
        return;
      }

      setSession({
        student_id: data.student_id,
        student_name: data.student_name || "Aluno",
      });

      window.location.href = "./aluno.html";
    } catch (err) {
      setMsg(msg, "is-error", err.message || "Falha de conexão.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
})();
