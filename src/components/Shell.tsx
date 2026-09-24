"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import { PixelIcon } from "./PixelIcon";
import { PrivacyPreferences } from "./SponsorSlot";
import { PlayerDock } from "./PlayerDock";
import { assetPath } from "@/lib/mix";
export function Shell({ children }: { children: React.ReactNode }) {
  const { tr, locale, setLocale, theme, setTheme, session, online, notice } =
    useApp();
  const pathname = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">
        {tr("Skip to listening desk", "Ir para a mesa de som")}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand">
            <Image
              src={assetPath("art/mark.svg")}
              width={40}
              height={40}
              alt=""
            />
            <span>
              Lino’s Binaural
              <small>
                {tr(
                  "A LITTLE ROOM FOR YOUR MIND",
                  "UM CANTINHO PARA SUA MENTE",
                )}
              </small>
            </span>
          </Link>
          <nav aria-label={tr("Main navigation", "Navegação principal")}>
            <Link
              className={pathname.includes("library") ? "active" : ""}
              href="/library/"
            >
              {tr("My library", "Minha coleção")}
            </Link>
            <Link href="/how-it-works/">
              {tr("How it works", "Como funciona")}
            </Link>
          </nav>
          <div className="header-actions">
            <button
              className="language-button"
              onClick={() => setLocale(locale === "en" ? "pt" : "en")}
              aria-label={tr("Mudar para português", "Switch to English")}
            >
              {locale === "en" ? "EN" : "PT"}
              <span aria-hidden="true">⌄</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "night" ? "day" : "night")}
              aria-label={tr(
                theme === "night" ? "Use day theme" : "Use night theme",
                theme === "night" ? "Usar tema claro" : "Usar tema noturno",
              )}
            >
              <PixelIcon name={theme === "night" ? "sun" : "moon"} />
            </button>
            <Link
              className="button small secondary account-link"
              aria-label={
                session ? tr("Account", "Conta") : tr("Sign in", "Entrar")
              }
              href="/account/"
            >
              <PixelIcon name="user" size={15} />
              <span>
                {session ? tr("Account", "Conta") : tr("Sign in", "Entrar")}
              </span>
            </Link>
          </div>
        </div>
      </header>
      {!online && (
        <div className="global-notice" role="status">
          {tr(
            "You’re offline. Loaded sounds still work. Account changes need a connection.",
            "Você está offline. Sons carregados continuam funcionando. Alterações na conta precisam de conexão.",
          )}
        </div>
      )}
      {notice && (
        <div className="global-notice" role="status">
          {notice}
        </div>
      )}
      {children}
      <footer className="site-footer">
        <Link href="/" className="footer-brand">
          Lino’s Binaural <span>·</span>{" "}
          {tr("Make yourself at home.", "Sinta-se em casa.")}
        </Link>
        <nav aria-label={tr("About and legal", "Sobre e informações legais")}>
          <Link href="/evidence/">{tr("The science", "A ciência")}</Link>
          <Link href="/privacy/">{tr("Privacy", "Privacidade")}</Link>
          <Link href="/terms/">{tr("Terms", "Termos")}</Link>
          <Link href="/credits/">{tr("Credits", "Créditos")}</Link>
          <Link href="/support/">{tr("Support", "Suporte")}</Link>
          <Link href="/ad-free/">{tr("Go ad-free", "Sem anúncios")}</Link>
        </nav>
        <PrivacyPreferences />
        <p>
          {tr(
            "All sounds. Every feature. Always free to listen.",
            "Todos os sons. Todos os recursos. Ouvir é sempre grátis.",
          )}
        </p>
      </footer>
      <PlayerDock />
    </>
  );
}
