(function () {
  const { qs, formatCPF, onlyDigits, setMsg, apiFetch, setToken, getToken } = window.API;

  const form = qs("#loginForm");
  const cpfInput = qs("#cpf");
  const passInput = qs("#password");
  const msg = qs("#loginMsg");
  const btn = qs("#btnLogin");

  // Se já tem token, vai direto pro checkout
  if (getToken()) {
    window.location.href = "./checkout.html";
    return;
  }

  cpfInput?.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg(msg, "is-info", "");

    const cpf = onlyDigits(cpfInput.value);
    const password = passInput.value;

    if (!cpf || !password) {
      setMsg(msg, "is-error", "Preencha CPF e senha para continuar.");
      return;
    }
    if (cpf.length !== 11) {
      setMsg(msg, "is-error", "CPF inválido. Verifique e tente novamente.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {
      const data = await apiFetch("/login/", {
        method: "POST",
        body: JSON.stringify({ cpf, password }),
      });

      // Aceita vários formatos possíveis
      const token =
        data?.token ||
        data?.access ||
        data?.jwt ||
        data?.access_token ||
        data?.data?.token ||
        "";

      if (!token) {
        // Se backend retornar {ok:false,error:"..."}
        const errMsg = data?.error || "Login OK, mas token não veio na resposta.";
        setMsg(msg, "is-error", errMsg);
        return;
      }

      setToken(token);
      window.location.href = "./checkout.html";
    } catch (err) {
      setMsg(msg, "is-error", err.message || "Falha de conexão. Tente novamente.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
})();