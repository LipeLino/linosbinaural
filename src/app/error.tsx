"use client";
import { useApp } from "@/components/AppProvider";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { tr } = useApp();
  return (
    <main id="main" className="content-page">
      <h1>
        {tr("Something interrupted the room.", "Algo interrompeu a sala.")}
      </h1>
      <p>
        {tr(
          "Try opening the room again. If you were saving a mix, check your shelf before retrying.",
          "Tente abrir a sala novamente. Se estava salvando um mix, confira sua coleção antes de tentar de novo.",
        )}
      </p>
      <button className="button primary" onClick={reset}>
        {tr("Try again", "Tentar novamente")}
      </button>
    </main>
  );
}
