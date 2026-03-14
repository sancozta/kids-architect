"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "kids-architect-chunk-reload";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isChunkLoadError =
      error.message.includes("Loading chunk") ||
      error.message.includes("ChunkLoadError") ||
      error.message.includes("/_next/static/chunks/");

    if (!isChunkLoadError) {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return;
    }

    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
    if (alreadyReloaded) {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return;
    }

    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060a0f] px-6 text-[#edf3f8]">
      <div className="w-full max-w-xl rounded-[5px] border border-white/10 bg-[rgba(17,24,32,0.92)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#8ea0b2]">Runtime Error</p>
        <h1 className="mt-2 text-2xl font-medium">A interface encontrou um erro.</h1>
        <p className="mt-3 text-sm leading-6 text-[#8ea0b2]">
          {error.message || "Falha inesperada ao renderizar o editor."}
        </p>
        {error.message.includes("Loading chunk") || error.message.includes("/_next/static/chunks/") ? (
          <p className="mt-2 text-xs leading-5 text-[#8ea0b2]">
            O app detectou um arquivo antigo em cache e tenta recarregar automaticamente a versao mais recente.
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center justify-center rounded-[5px] bg-[#df7534] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f08f56]"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
