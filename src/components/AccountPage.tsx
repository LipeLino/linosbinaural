"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import {
  authAvailable,
  getAuthClient,
  signIn,
  signUp,
  sendRecovery,
  updatePassword,
  signOut,
} from "@/lib/auth";
import { api, ApiClientError } from "@/lib/api";
import { Modal } from "./Modal";
import { PixelIcon } from "./PixelIcon";
export function AccountPage() {
  const {
    tr,
    locale,
    session,
    authLoading,
    entitled,
    refreshEntitlement,
    setNotice,
  } = useApp();
  const [mode, setMode] = useState<
    "signin" | "signup" | "recover" | "password"
  >("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [checkout, setCheckout] = useState("");
  const attempted = useRef(false);
  useEffect(() => {
    const auth = getAuthClient();
    if (!auth) return;
    const { data } = auth.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("password");
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    void api
      .account()
      .then((p) => {
        if (active) setDisplayName(p.displayName ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "cancelled") setCheckout("cancelled");
    if (params.get("error"))
      setError(
        tr(
          "The account link is expired or invalid. Request a new email below.",
          "O link expirou ou é inválido. Solicite outro e-mail abaixo.",
        ),
      );
    if (!session || attempted.current || params.get("checkout") !== "return")
      return;
    const id = params.get("session_id");
    if (!id) {
      setCheckout("failed");
      return;
    }
    attempted.current = true;
    setCheckout("checking");
    void api
      .reconcileCheckout(id)
      .then(async (result) => {
        setCheckout(result.status);
        await refreshEntitlement();
      })
      .catch(() => setCheckout("pending"));
  }, [session, refreshEntitlement, tr]);
  async function perform(action: () => Promise<void>) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ApiClientError && e.code === "service_unavailable"
          ? tr(
              "The account service is unavailable. Please try again later.",
              "O serviço de contas está indisponível. Tente novamente mais tarde.",
            )
          : tr(
              "That did not work. Check your details and connection, then try again.",
              "Não foi possível concluir. Confira os dados e a conexão e tente novamente.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  const checkoutText: Record<string, [string, string]> = {
    checking: [
      "Checking your payment securely…",
      "Verificando seu pagamento com segurança…",
    ],
    pending: [
      "Your payment is still being confirmed. This page does not grant ad-free access; your account status below is authoritative.",
      "Seu pagamento ainda está sendo confirmado. Esta página não libera acesso sem anúncios; o status da conta abaixo é o válido.",
    ],
    paid: [
      "Payment confirmed. Your account’s ad-free status has been refreshed.",
      "Pagamento confirmado. O status sem anúncios da conta foi atualizado.",
    ],
    cancelled: [
      "Checkout cancelled. You can keep listening for free.",
      "Compra cancelada. Você pode continuar ouvindo grátis.",
    ],
    failed: [
      "The payment was not completed. No ad-free access was granted.",
      "O pagamento não foi concluído. O acesso sem anúncios não foi liberado.",
    ],
    refunded: [
      "This purchase has been refunded.",
      "Esta compra foi reembolsada.",
    ],
    disputed: [
      "This purchase is under dispute. Contact support for help.",
      "Esta compra está em disputa. Entre em contato com o suporte.",
    ],
  };
  return (
    <main id="main" className="content-page">
      <span className="eyebrow">
        {tr("YOUR CORNER OF THE ROOM", "SEU CANTINHO NA SALA")}
      </span>
      <h1>{tr("Make yourself at home.", "Sinta-se em casa.")}</h1>
      <p>
        {tr(
          "Keep your favorite sounds together, wherever you listen.",
          "Guarde seus sons favoritos, onde quer que você ouça.",
        )}
      </p>
      {checkout && (
        <div className="status-message" role="status">
          {tr(...(checkoutText[checkout] ?? checkoutText.pending))}
          {checkout === "pending" && (
            <button
              className="text-button"
              onClick={() => {
                attempted.current = false;
                void perform(async () => {
                  const id = new URLSearchParams(window.location.search).get(
                    "session_id",
                  );
                  if (id) {
                    setCheckout((await api.reconcileCheckout(id)).status);
                    await refreshEntitlement();
                  }
                });
              }}
            >
              {tr("Check again", "Verificar novamente")}
            </button>
          )}
        </div>
      )}
      {authLoading ? (
        <p role="status">{tr("Opening your account…", "Abrindo sua conta…")}</p>
      ) : !authAvailable ? (
        <section className="content-panel">
          <h2>
            {tr("The listening room is open.", "A sala de escuta está aberta.")}
          </h2>
          <p>
            {tr(
              "Account services are not connected in this installation yet. You can use every sound and control without signing in; your current mix stays on this device.",
              "Os serviços de conta ainda não estão conectados nesta instalação. Você pode usar todos os sons e controles sem entrar; seu mix atual fica neste dispositivo.",
            )}
          </p>
          <Link className="button primary" href="/">
            {tr("Back to the listening desk", "Voltar à mesa de som")}
          </Link>
        </section>
      ) : session && mode !== "password" ? (
        <>
          <section className="content-panel">
            <div className="section-heading">
              <h2>{tr("Your account", "Sua conta")}</h2>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await signOut();
                    setNotice(
                      tr(
                        "You’re signed out. Your local mix is still here.",
                        "Você saiu. Seu mix local continua aqui.",
                      ),
                    );
                  })
                }
              >
                {tr("Sign out", "Sair")}
              </button>
            </div>
            <p>{session.user.email}</p>
            <div className="status-message">
              {entitled === null
                ? tr(
                    "Ad-free status is unresolved. Advertising stays off.",
                    "O status sem anúncios está pendente. Os anúncios permanecem desativados.",
                  )
                : entitled
                  ? tr(
                      "Ad-free access is active on your account.",
                      "O acesso sem anúncios está ativo na sua conta.",
                    )
                  : tr(
                      "Free listening account. All sounds and controls are included.",
                      "Conta gratuita. Todos os sons e controles estão incluídos.",
                    )}
            </div>
            <label className="form-field">
              {tr("Public display name (optional)", "Nome público (opcional)")}
              <input
                maxLength={40}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <p className="muted">
              {tr(
                "Only this optional name can appear with a published mix. Your email stays private.",
                "Somente este nome opcional pode aparecer em um mix publicado. Seu e-mail permanece privado.",
              )}
            </p>
            <div className="button-row">
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await api.updateAccount(displayName.trim() || null);
                    setMessage(
                      tr("Display name saved.", "Nome público salvo."),
                    );
                  })
                }
              >
                {tr("Save name", "Salvar nome")}
              </button>
              <Link href="/library/" className="button secondary">
                {tr("Open my library", "Abrir minha coleção")}
              </Link>
              <Link href="/ad-free/" className="button secondary">
                {tr("Ad-free access", "Acesso sem anúncios")}
              </Link>
            </div>
          </section>
          <section className="content-panel">
            <h2>{tr("Your data, your choice", "Seus dados, sua escolha")}</h2>
            <p>
              {tr(
                "Export your mixes as JSON, update your password, or permanently delete your account. Transaction records may be retained where required; see Privacy.",
                "Exporte seus mixes em JSON, altere sua senha ou exclua sua conta permanentemente. Registros de transações podem ser mantidos quando necessário; consulte Privacidade.",
              )}
            </p>
            <div className="button-row">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    const data = await api.exportAccount();
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "linos-binaural-account.json";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    setMessage(
                      tr(
                        "Your export is ready for download.",
                        "Sua exportação está pronta para download.",
                      ),
                    );
                  })
                }
              >
                {tr("Export my data", "Exportar meus dados")}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setMode("password")}
              >
                {tr("Change password", "Alterar senha")}
              </button>
              <button
                className="button danger-button"
                disabled={busy}
                onClick={() => {
                  setConfirmation("");
                  setDeleteOpen(true);
                }}
              >
                {tr("Delete account", "Excluir conta")}
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="content-panel account-form">
          <h2>
            {mode === "signup"
              ? tr("Your own record shelf", "Sua própria coleção")
              : mode === "recover"
                ? tr("Find your way back", "Recupere seu acesso")
                : mode === "password"
                  ? tr("A new password", "Uma nova senha")
                  : tr("Welcome back", "Boas-vindas de volta")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                const result =
                  mode === "signup"
                    ? await signUp(email, password, locale)
                    : mode === "recover"
                      ? await sendRecovery(email)
                      : mode === "password"
                        ? await updatePassword(password)
                        : await signIn(email, password);
                if (result.error) {
                  const code = result.error.code;
                  if (code === "invalid_credentials") {
                    setError(
                      tr(
                        "Email or password is incorrect.",
                        "E-mail ou senha incorretos.",
                      ),
                    );
                    return;
                  }
                  if (code === "email_not_confirmed") {
                    setError(
                      tr(
                        "Confirm your email before signing in. Check your inbox and spam folder.",
                        "Confirme seu e-mail antes de entrar. Confira sua caixa de entrada e spam.",
                      ),
                    );
                    return;
                  }
                  throw result.error;
                }
                setPassword("");
                if (mode === "signup")
                  setMessage(
                    tr(
                      "Check your email to verify your account, then sign in.",
                      "Confira seu e-mail para verificar a conta e depois entre.",
                    ),
                  );
                if (mode === "recover")
                  setMessage(
                    tr(
                      "If an account exists, a recovery email is on its way. Check your inbox and spam folder.",
                      "Se a conta existir, um e-mail de recuperação será enviado. Confira sua caixa de entrada e spam.",
                    ),
                  );
                if (mode === "password") {
                  setMode("signin");
                  setMessage(tr("Password updated.", "Senha atualizada."));
                }
              });
            }}
          >
            {mode !== "password" && (
              <label className="form-field">
                {tr("Email", "E-mail")}
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                />
              </label>
            )}
            {mode !== "recover" && (
              <label className="form-field">
                {tr("Password", "Senha")}
                <input
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  minLength={mode === "signin" ? 1 : 12}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                />
                {mode !== "signin" && (
                  <small>
                    {tr("At least 12 characters.", "Pelo menos 12 caracteres.")}
                  </small>
                )}
              </label>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? tr("One moment…", "Um momento…")
                : mode === "signup"
                  ? tr("Create account", "Criar conta")
                  : mode === "recover"
                    ? tr("Send recovery email", "Enviar e-mail de recuperação")
                    : mode === "password"
                      ? tr("Update password", "Atualizar senha")
                      : tr("Sign in", "Entrar")}
            </button>
          </form>
          <div className="button-row">
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setMessage("");
              }}
            >
              {mode === "signin"
                ? tr("Create a free account", "Criar uma conta gratuita")
                : tr("Back to sign in", "Voltar para entrar")}
            </button>
            {mode === "signin" && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setMode("recover")}
              >
                {tr("Forgot your password?", "Esqueceu sua senha?")}
              </button>
            )}
          </div>
          <p className="muted">
            {tr(
              "Creating an account accepts our Terms and Privacy policy.",
              "Ao criar uma conta você aceita nossos Termos e Política de Privacidade.",
            )}{" "}
            <Link href="/terms/">{tr("Read terms", "Ler termos")}</Link>
          </p>
        </section>
      )}
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!busy) setDeleteOpen(false);
        }}
        title={tr("Delete your account?", "Excluir sua conta?")}
      >
        <p>
          {tr(
            "This permanently removes your mixes and revokes all public links. Ad-free access cannot be restored to a deleted account. Type DELETE to confirm.",
            "Isso remove seus mixes permanentemente e revoga todos os links públicos. O acesso sem anúncios não pode ser restaurado em uma conta excluída. Digite DELETE para confirmar.",
          )}
        </p>
        <label className="form-field">
          {tr("Confirmation", "Confirmação")}
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          className="button danger-button"
          disabled={busy || confirmation !== "DELETE"}
          onClick={() =>
            void perform(async () => {
              await api.deleteAccount();
              await signOut();
              setDeleteOpen(false);
              setNotice(tr("Account deleted.", "Conta excluída."));
            })
          }
        >
          {busy
            ? tr("Deleting…", "Excluindo…")
            : tr("Permanently delete", "Excluir permanentemente")}
        </button>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </Modal>
    </main>
  );
}
