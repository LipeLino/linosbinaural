"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { Modal } from "./Modal";
import { PixelIcon } from "./PixelIcon";
import { SaveMixButton, Transport } from "./ListeningDesk";
import { api, type SavedMix } from "@/lib/api";
import { assetPath } from "@/lib/mix";
import { authAvailable } from "@/lib/auth";
export function LibraryPage() {
  const {
    tr,
    session,
    authLoading,
    loadMix,
    audio,
    setNotice,
    libraryRevision,
  } = useApp();
  const router = useRouter();
  const [records, setRecords] = useState<SavedMix[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SavedMix | null>(null);
  const [deleting, setDeleting] = useState<SavedMix | null>(null);
  const [publishing, setPublishing] = useState<SavedMix | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const requestGeneration = useRef(0);
  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setRecords([]);
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.listMixes();
      if (generation !== requestGeneration.current) return;
      setRecords(result);
    } catch {
      if (generation !== requestGeneration.current) return;
      setError(
        tr(
          "Your library could not be loaded. Your mixes have not been changed.",
          "Não foi possível carregar sua coleção. Seus mixes não foram alterados.",
        ),
      );
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [session, tr]);
  useEffect(() => {
    void refresh();
    return () => {
      requestGeneration.current += 1;
    };
  }, [refresh, libraryRevision]);
  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch {
      setError(
        tr(
          "This change could not be saved. Please try again.",
          "Não foi possível salvar esta alteração. Tente novamente.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="content-page library-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {tr("COLLECT LITTLE MOMENTS", "COLECIONE PEQUENOS MOMENTOS")}
          </span>
          <h1>{tr("Your record shelf", "Sua coleção de discos")}</h1>
        </div>
        {session && <SaveMixButton />}
      </div>
      <p>
        {tr(
          "Your mixes are private until you choose to share them.",
          "Seus mixes são privados até você decidir compartilhá-los.",
        )}
      </p>
      {audio.status !== "idle" && <Transport compact />}
      {authLoading || loading ? (
        <p role="status">
          {tr("Finding your records…", "Buscando seus discos…")}
        </p>
      ) : !session ? (
        <div className="empty-shelf">
          <PixelIcon name="record" size={48} />
          <h2>
            {tr("A shelf with your name on it.", "Uma coleção com a sua cara.")}
          </h2>
          <p>
            {authAvailable
              ? tr(
                  "Sign in to save, edit, and share your own little soundscapes.",
                  "Entre para salvar, editar e compartilhar suas paisagens sonoras.",
                )
              : tr(
                  "Cloud accounts are not connected here yet. Your listening draft stays on this device.",
                  "As contas na nuvem ainda não estão conectadas. Seu rascunho de áudio fica neste dispositivo.",
                )}
          </p>
          <Link
            href={authAvailable ? "/account/" : "/"}
            className="button primary"
          >
            {authAvailable
              ? tr("Sign in to my shelf", "Entrar na minha coleção")
              : tr("Back to listening", "Voltar a ouvir")}
          </Link>
        </div>
      ) : records.length === 0 && !error ? (
        <div className="empty-shelf">
          <PixelIcon name="record" size={48} />
          <h2>
            {tr(
              "Your first record starts here.",
              "Seu primeiro disco começa aqui.",
            )}
          </h2>
          <p>
            {tr(
              "Create a mix at the listening desk, then save it to this shelf.",
              "Crie um mix na mesa de som e salve nesta coleção.",
            )}
          </p>
          <Link href="/" className="button primary">
            {tr("Make a mix", "Criar um mix")}
          </Link>
        </div>
      ) : (
        <ul className="saved-grid">
          {records.map((record) => (
            <li key={record.id} className="saved-record">
              <Image
                src={assetPath(`art/cover-${record.mix.cover}.svg`)}
                width={96}
                height={96}
                alt=""
              />
              <span className="eyebrow">
                {record.publishedAt
                  ? tr("SHARED", "COMPARTILHADO")
                  : tr("PRIVATE", "PRIVADO")}
              </span>
              <h2>{record.title}</h2>
              {record.description && <p>{record.description}</p>}
              <p>
                {record.mix.binaural.enabled
                  ? `${record.mix.binaural.beat} Hz · `
                  : tr("Ambience only · ", "Só ambiente · ")}
                {record.mix.durationMinutes === null
                  ? tr("Continuous", "Contínuo")
                  : `${record.mix.durationMinutes} min`}
              </p>
              <div className="button-row">
                <button
                  className="button primary"
                  onClick={() => {
                    loadMix(
                      record.mix,
                      record.title,
                      record.id,
                      record.description,
                    );
                    router.push("/");
                  }}
                >
                  {tr("Load & edit", "Carregar e editar")}
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditing(record);
                    setName(record.title);
                    setDescription(record.description);
                  }}
                >
                  {tr("Rename", "Renomear")}
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await api.duplicateMix(record.id);
                      setNotice(
                        tr(
                          "Private copy added to your shelf.",
                          "Cópia privada adicionada à coleção.",
                        ),
                      );
                    })
                  }
                >
                  {tr("Duplicate", "Duplicar")}
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setPublishing(record);
                    setShareUrl(
                      record.shareToken
                        ? `${window.location.origin}/linosbinaural/shared/?token=${record.shareToken}`
                        : "",
                    );
                  }}
                >
                  {record.publishedAt
                    ? tr("Sharing", "Compartilhamento")
                    : tr("Share", "Compartilhar")}
                </button>
                <button
                  className="button danger-button"
                  disabled={busy}
                  onClick={() => setDeleting(record)}
                >
                  {tr("Delete", "Excluir")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div role="alert" className="field-error">
          {error}
          <button className="text-button" onClick={() => void refresh()}>
            {tr("Retry", "Tentar novamente")}
          </button>
        </div>
      )}
      <Modal
        open={!!editing}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
        title={tr("A name for this record", "Um nome para este disco")}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editing)
              void act(async () => {
                await api.updateMix(editing.id, {
                  title: name.trim(),
                  description: description.trim(),
                });
                setEditing(null);
              });
          }}
        >
          <label className="form-field">
            {tr("Title", "Título")}
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="form-field">
            {tr("Description", "Descrição")}
            <textarea
              maxLength={280}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={busy || !name.trim()}>
            {busy
              ? tr("Saving…", "Salvando…")
              : tr("Save changes", "Salvar alterações")}
          </button>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        title={tr("Remove this record?", "Remover este disco?")}
      >
        <p>
          {tr(
            "This permanently deletes the saved mix and revokes its public link. Your current listening draft is kept.",
            "Isso exclui o mix salvo permanentemente e revoga seu link público. Seu rascunho atual é mantido.",
          )}
        </p>
        <button
          className="button danger-button"
          disabled={busy}
          onClick={() => {
            if (deleting)
              void act(async () => {
                await api.deleteMix(deleting.id);
                setDeleting(null);
              });
          }}
        >
          {busy
            ? tr("Deleting…", "Excluindo…")
            : tr("Delete saved mix", "Excluir mix salvo")}
        </button>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </Modal>
      <Modal
        open={!!publishing}
        onClose={() => {
          if (!busy) setPublishing(null);
        }}
        title={tr("Share a little quiet", "Compartilhe um pouco de calma")}
      >
        <p>
          {tr(
            "Anyone with the link can play this mix. Your optional display name may appear; your email never does. Visitors change their own copy.",
            "Qualquer pessoa com o link pode ouvir este mix. Seu nome público opcional pode aparecer; seu e-mail nunca aparece. Visitantes alteram suas próprias cópias.",
          )}
        </p>
        {shareUrl ? (
          <>
            <label className="form-field">
              {tr("Public link", "Link público")}
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <div className="button-row">
              <button
                className="button primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setNotice(tr("Share link copied.", "Link copiado."));
                  } catch {
                    setNotice(
                      tr(
                        "Copy the selected link manually.",
                        "Copie o link selecionado manualmente.",
                      ),
                    );
                  }
                }}
              >
                {tr("Copy link", "Copiar link")}
              </button>
              <button
                className="button danger-button"
                disabled={busy}
                onClick={() => {
                  if (publishing)
                    void act(async () => {
                      await api.unpublishMix(publishing.id);
                      setShareUrl("");
                      setPublishing(null);
                      setNotice(
                        tr(
                          "Link revoked. Downloaded copies cannot be erased.",
                          "Link revogado. Cópias já baixadas não podem ser apagadas.",
                        ),
                      );
                    });
                }}
              >
                {tr("Unpublish & revoke link", "Despublicar e revogar link")}
              </button>
            </div>
          </>
        ) : (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              if (publishing)
                void act(async () => {
                  const published = await api.publishMix(publishing.id);
                  setShareUrl(published.url);
                });
            }}
          >
            {busy
              ? tr("Publishing…", "Publicando…")
              : tr("Publish this mix", "Publicar este mix")}
          </button>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </Modal>
    </main>
  );
}
