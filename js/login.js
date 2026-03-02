(function () {
  const { qs, formatCPF, onlyDigits, setMsg, apiFetch } = window.API;

  const form = qs("#loginForm");
  const cpfInput = qs("#cpf");
  const passInput = qs("#password");
  const msg = qs("#loginMsg");
  const btn = qs("#btnLogin");

  // ✅ sessão simples (porque seu backend não manda token)
  const SESSION_KEY = "fi_session";
  const getSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}"); }
    catch { return {}; }
  };
  const setSession = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s || {}));

  // Se já tem sessão, vai direto pro checkout
  if (getSession()?.student_id) {
    window.location.href = "./checkout.html";
    return;
  }

  cpfInput?.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "is-info", "");

    const cpf = onlyDigits(cpfInput?.value);
    const password = passInput?.value; // sua API aceita password? (vamos usar como está)

    if (!cpf || cpf.length !== 11) {
      setMsg(msg, "is-error", "CPF inválido.");
      return;
    }
    if (!password) {
      setMsg(msg, "is-error", "Preencha a senha para continuar.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      // ✅ IMPORTANTE: como API_BASE já tem /api, aqui é só "/login/"
      const data = await apiFetch("/login/", {
        method: "POST",
        body: JSON.stringify({ cpf, password }),
      });

      if (!data?.ok || !data?.student_id) {
        setMsg(msg, "is-error", data?.error || "Login não autorizado.");
        return;
      }

      // ✅ salva “sessão”
      setSession({ student_id: data.student_id, student_name: data.student_name });

      setMsg(msg, "is-success", `Bem-vindo(a), ${data.student_name || "aluno"}!`);
      setTimeout(() => {
        window.location.href = "./checkout.html";
      }, 300);
    } catch (err) {
      const raw = String(err?.message || "");
      const clean =
        raw.includes("<!doctype") || raw.includes("<html")
          ? "Endpoint não encontrado (verifique a URL do backend)."
          : raw;

      setMsg(msg, "is-error", clean || "Falha de conexão. Tente novamente.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
})();
