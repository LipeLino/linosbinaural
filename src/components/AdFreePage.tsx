"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { PixelIcon } from "./PixelIcon";
import { api, ApiClientError } from "@/lib/api";
export function AdFreePage() {
  const { tr, session, entitled, authLoading, engine } = useApp();
  const [currency, setCurrency] = useState<"usd" | "brl">("usd");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const enabled = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true";
  return (
    <main id="main" className="content-page">
      <span className="eyebrow">
        {tr(
          "A LITTLE SUPPORT, A QUIETER ROOM",
          "UM POUCO DE APOIO, UMA SALA MAIS TRANQUILA",
        )}
      </span>
      <h1>{tr("Just you and your sounds.", "Só você e seus sons.")}</h1>
      <p>
        {tr(
          "Remove display advertising with a one-time purchase. Every sound and listening feature is already free.",
          "Remova a publicidade com uma compra única. Todos os sons e recursos de áudio já são gratuitos.",
        )}
      </p>
      <section className="content-panel purchase-panel">
        <PixelIcon name="record" size={40} />
        <h2>{tr("Ad-free listening", "Ouvir sem anúncios")}</h2>
        <p>
          {tr(
            "One payment. No subscription. Connected to your account, across your signed-in devices.",
            "Um pagamento. Sem assinatura. Vinculado à sua conta em todos os dispositivos conectados.",
          )}
        </p>
        <fieldset className="currency-choices">
          <legend>{tr("Choose your currency", "Escolha a moeda")}</legend>
          <label>
            <input
              type="radio"
              name="currency"
              value="usd"
              checked={currency === "usd"}
              onChange={() => setCurrency("usd")}
            />
            <strong>US$5.00</strong>
            <span>USD</span>
          </label>
          <label>
            <input
              type="radio"
              name="currency"
              value="brl"
              checked={currency === "brl"}
              onChange={() => setCurrency("brl")}
            />
            <strong>R$20,00</strong>
            <span>BRL</span>
          </label>
        </fieldset>
        <p className="muted">
          {tr(
            "Two fixed prices, not an exchange-rate conversion. The final charge is shown by Stripe before you pay.",
            "Dois preços fixos, não uma conversão cambial. A cobrança final aparece no Stripe antes do pagamento.",
          )}
        </p>
        {entitled === true ? (
          <p className="status-message">
            {tr(
              "Your account is already ad-free. Thank you.",
              "Sua conta já está sem anúncios. Obrigado.",
            )}
          </p>
        ) : !enabled ? (
          <p className="status-message">
            {tr(
              "Purchases are not available in this installation yet. You can still use every listening feature for free.",
              "As compras ainda não estão disponíveis nesta instalação. Você pode continuar usando todos os recursos de áudio gratuitamente.",
            )}
          </p>
        ) : authLoading ? (
          <p role="status">
            {tr("Checking your account…", "Verificando sua conta…")}
          </p>
        ) : !session ? (
          <Link href="/account/" className="button primary">
            {tr("Sign in before purchasing", "Entre antes de comprar")}
          </Link>
        ) : entitled === null ? (
          <p className="status-message">
            {tr(
              "Your purchase status could not be confirmed. Refresh your account before starting another purchase.",
              "Não foi possível confirmar seu status de compra. Atualize a conta antes de iniciar outra compra.",
            )}
          </p>
        ) : (
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const checkout = await api.checkout(currency);
                const url = new URL(checkout.url);
                if (url.origin !== "https://checkout.stripe.com")
                  throw new Error("checkout");
                engine.pause();
                window.location.assign(url.href);
              } catch (e) {
                setError(
                  e instanceof ApiClientError && e.code === "already_entitled"
                    ? tr(
                        "Your account already has ad-free access. Refresh your account.",
                        "Sua conta já tem acesso sem anúncios. Atualize sua conta.",
                      )
                    : tr(
                        "Checkout could not be opened. No payment was taken by this action. Please try again later.",
                        "Não foi possível abrir a compra. Esta ação não realizou uma cobrança. Tente novamente mais tarde.",
                      ),
                );
                setBusy(false);
              }
            }}
          >
            {busy
              ? tr("Opening secure checkout…", "Abrindo pagamento seguro…")
              : tr(
                  `Continue to checkout · ${currency === "usd" ? "US$5.00" : "R$20.00"}`,
                  `Continuar para pagamento · ${currency === "usd" ? "US$5.00" : "R$20,00"}`,
                )}
          </button>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <p className="muted">
          {tr(
            "Checkout opens on Stripe and interrupts playback. Your draft is kept locally. On return, sign in to restore verified access; a return URL alone never unlocks it.",
            "A compra abre no Stripe e interrompe a reprodução. Seu rascunho fica salvo localmente. Ao retornar, entre para restaurar o acesso verificado; a URL de retorno por si só nunca libera o benefício.",
          )}
        </p>
      </section>
      <h2>{tr("What you’re supporting", "O que você está apoiando")}</h2>
      <p>
        {tr(
          "A small independent listening app. The purchase removes advertising while this service operates; it is not a promise of perpetual infrastructure, medical benefit or uninterrupted availability.",
          "Um pequeno aplicativo independente de áudio. A compra remove anúncios enquanto o serviço estiver em operação; não é uma promessa de infraestrutura perpétua, benefício médico ou disponibilidade ininterrupta.",
        )}
      </p>
      <p>
        {tr(
          "Refunds and payment disputes may revoke ad-free access. For payment help, use the configured support channel and include the payment receipt reference—not card details.",
          "Reembolsos e disputas de pagamento podem revogar o acesso sem anúncios. Para ajuda, use o canal de suporte configurado e informe a referência do recibo, nunca dados do cartão.",
        )}{" "}
        <Link href="/support/">{tr("Support", "Suporte")}</Link> ·{" "}
        <Link href="/terms/">{tr("Purchase terms", "Termos da compra")}</Link>
      </p>
    </main>
  );
}
