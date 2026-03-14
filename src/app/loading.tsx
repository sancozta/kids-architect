export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060a0f] px-6 text-[#edf3f8]">
      <div className="w-full max-w-xl rounded-[5px] border border-white/10 bg-[rgba(17,24,32,0.92)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#8ea0b2]">Loading</p>
        <h1 className="mt-2 text-2xl font-medium">Inicializando editor</h1>
        <p className="mt-3 text-sm leading-6 text-[#8ea0b2]">
          Preparando layout, viewport 3D e tracker de gestos.
        </p>
      </div>
    </main>
  );
}
