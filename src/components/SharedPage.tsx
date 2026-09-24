"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, type SharedMix } from "@/lib/api";
import { assetPath } from "@/lib/mix";
import { useApp } from "./AppProvider";
import { Modal } from "./Modal";
export function SharedPage() {
  const { tr, loadMix } = useApp();
  const router = useRouter();
  const [mix, setMix] = useState<SharedMix | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(false);
  const [reason, setReason] = useState<
    "copyright" | "abuse" | "privacy" | "other"
  >("abuse");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(key);
    let active = true;
    if (!/^[a-f0-9]{48}$/.test(key)) {
      setLoading(false);
      setError("unavailable");
      return;
    }
    void api
      .sharedMix(key)
      .then((data) => {
        if (active) setMix(data);
      })
      .catch(() => {
        if (active) setError("unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main id="main" className="content-page">
      <span className="eyebrow">
        {tr("A RECORD PASSED TO YOU", "UM DISCO COMPARTILHADO COM VOCÊ")}
      </span>
      <h1>{tr("A little shared quiet", "Um pouco de calma compartilhada")}</h1>
      {loading ? (
        <p role="status">{tr("Opening this record…", "Abrindo este disco…")}</p>
      ) : !mix ? (
        <section className="content-panel">
          <h2>
            {tr("This record is unavailable", "Este disco está indisponível")}
          </h2>
          <p>
            {tr(
              "Its link may have been revoked, or the service may be temporarily unavailable. Private mixes are never shown here.",
              "O link pode ter sido revogado ou o serviço pode estar temporariamente indisponível. Mixes privados nunca são exibidos aqui.",
            )}
          </p>
          <Link className="button primary" href="/">
            {tr("Explore the listening room", "Explorar a sala de escuta")}
          </Link>
        </section>
      ) : (
        <section className="content-panel shared-record">
          <Image
            src={assetPath(`art/cover-${mix.mix.cover}.svg`)}
            width={192}
            height={192}
            alt=""
          />
          <h2>{mix.title}</h2>
          {mix.displayName && (
            <p>
              {tr("Shared by ", "Compartilhado por ")}
              {mix.displayName}
            </p>
          )}
          {mix.description && <p>{mix.description}</p>}
          <p>
            {tr(
              "Load it at the desk, then press play when you’re ready. Your volume stays unchanged, and your adjustments do not change the original.",
              "Carregue na mesa e pressione reproduzir quando quiser. Seu volume permanece igual, e seus ajustes não alteram o original.",
            )}
          </p>
          <button
            className="button primary"
            onClick={() => {
              loadMix(mix.mix, mix.title);
              router.push("/");
            }}
          >
            {tr("Load this mix", "Carregar este mix")}
          </button>
          <p>
            <button className="text-button" onClick={() => setReport(true)}>
              {tr("Report this shared mix", "Denunciar este mix")}
            </button>
          </p>
        </section>
      )}
      <Modal
        open={report}
        onClose={() => {
          if (!busy) setReport(false);
        }}
        title={tr("Report this mix", "Denunciar este mix")}
      >
        {sent ? (
          <p role="status">
            {tr(
              "Your report was recorded for review.",
              "Sua denúncia foi registrada para análise.",
            )}
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api.report(token, reason, details);
                setSent(true);
              } catch {
                setError(
                  tr(
                    "The report could not be submitted. Please try later or use Support.",
                    "Não foi possível enviar a denúncia. Tente mais tarde ou use o Suporte.",
                  ),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="form-field">
              {tr("Reason", "Motivo")}
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
              >
                <option value="abuse">{tr("Abuse", "Abuso")}</option>
                <option value="privacy">{tr("Privacy", "Privacidade")}</option>
                <option value="copyright">
                  {tr("Copyright", "Direitos autorais")}
                </option>
                <option value="other">{tr("Other", "Outro")}</option>
              </select>
            </label>
            <label className="form-field">
              {tr(
                "Details (do not include sensitive information)",
                "Detalhes (não inclua dados sensíveis)",
              )}
              <textarea
                maxLength={500}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={busy}>
              {busy
                ? tr("Sending…", "Enviando…")
                : tr("Submit report", "Enviar denúncia")}
            </button>
            {error && error !== "unavailable" && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </Modal>
    </main>
  );
}
