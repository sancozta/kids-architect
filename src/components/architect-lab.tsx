"use client";

import { Activity, CircleHelp, DraftingCompass, ExternalLink, Expand, FileImage, Lock, LockOpen, Minimize2, Plus, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { ASSET_LIBRARY } from "@/lib/asset-library";
import { DEFAULT_PLAN_MODEL } from "@/lib/default-plan";
import { createPlanModelFromFile } from "@/lib/plan-to-model";
import type { GestureFrame, PlanModel } from "@/lib/types";

const GestureTracker = dynamic(
  () => import("@/components/gesture-tracker").then((module) => module.GestureTracker),
  {
    ssr: false,
    loading: () => <PanelFallback label="Inicializando camera" description="Preparando captura e tracker de gestos." />,
  },
);

const ThreeHouseViewer = dynamic(
  () => import("@/components/three-house-viewer").then((module) => module.ThreeHouseViewer),
  {
    ssr: false,
    loading: () => <PanelFallback label="Carregando viewport" description="Montando renderer 3D da maquete." />,
  },
);

const EMPTY_GESTURE: GestureFrame = {
  handDetected: false,
  detectedHands: 0,
  primaryHand: null,
  secondaryHand: null,
  gestureActive: false,
  pinchDistance: 0,
  rotationDeltaX: 0,
  rotationDeltaY: 0,
  rotationDeltaZ: 0,
  zoomDelta: 0,
};

export function ArchitectLab() {
  const gestureRef = useRef<GestureFrame>(EMPTY_GESTURE);
  const lastHudRef = useRef(0);
  const [planModel, setPlanModel] = useState<PlanModel>(DEFAULT_PLAN_MODEL);
  const [consoleLogs, setConsoleLogs] = useState<string[]>(["Usando planta de exemplo para validar a experiencia inicial."]);
  const [isConverting, setIsConverting] = useState(false);
  const [isGestureMovementLocked, setIsGestureMovementLocked] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isViewerExpanded, setIsViewerExpanded] = useState(false);
  const [gestureHud, setGestureHud] = useState(EMPTY_GESTURE);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);

  const appendConsoleLog = useCallback((message: string) => {
    setConsoleLogs((current) => [message, ...current].slice(0, 12));
  }, []);

  const handleUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsConverting(true);
    appendConsoleLog(`Importacao iniciada para ${file.name}.`);

    try {
      setPlanModel((current) => {
        if (current.imageUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(current.imageUrl);
        }
        return current;
      });

      const nextModel = await createPlanModelFromFile(file);
      setPlanModel(nextModel);
      appendConsoleLog(`Planta ${file.name} convertida com sucesso.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao converter a planta.";
      appendConsoleLog(message);
    } finally {
      setIsConverting(false);
      event.target.value = "";
    }
  }, [appendConsoleLog]);

  const handleGesture = useCallback((frame: GestureFrame) => {
    gestureRef.current = frame;

    const now = performance.now();
    if (now - lastHudRef.current > 120) {
      lastHudRef.current = now;
      setGestureHud(frame);
    }
  }, []);

  const handleAssetSelect = useCallback((assetId: string, assetLabel: string) => {
    setSelectedAssetIds((current) => (current.includes(assetId) ? current : [...current, assetId]));
    appendConsoleLog(`Objeto ${assetLabel} adicionado a fila da biblioteca 3D.`);
  }, [appendConsoleLog]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[2400px] flex-col gap-3 overflow-auto bg-[var(--shell)] px-3 py-3 text-[var(--foreground)] xl:h-[100svh] xl:overflow-hidden 2xl:px-4 min-[2200px]:max-w-none min-[2200px]:px-6 min-[2600px]:px-8">
      <header className="glass-panel relative z-40 flex flex-col gap-3 rounded-[5px] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-[var(--accent)] text-white shadow-[0_12px_24px_rgba(223,117,52,0.28)]">
            <DraftingCompass className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">Workspace</p>
            <h1 className="truncate text-lg font-medium">Kids Architect Editor</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAssetLibraryOpen((current) => !current)}
            className={`inline-flex h-9 min-w-[132px] items-center justify-center gap-2 rounded-[5px] border px-3 py-2 text-xs transition ${
              assetLibraryOpen
                ? "border-[var(--accent)]/35 bg-[var(--accent)]/16 text-[var(--foreground)]"
                : "border-white/8 bg-[var(--panel-strong)] text-[var(--muted)]"
            }`}
          >
            <Plus className="size-3.5 text-[var(--accent)]" />
            <span>Biblioteca 3D</span>
            <span className="rounded-[4px] bg-white/6 px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">{selectedAssetIds.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGestureMovementLocked((current) => !current)}
            className={`inline-flex h-9 min-w-[148px] items-center justify-center gap-2 rounded-[5px] border px-3 py-2 text-xs transition ${
              isGestureMovementLocked
                ? "border-[var(--accent)]/35 bg-[var(--accent)]/16 text-[var(--foreground)]"
                : "border-white/8 bg-[var(--panel-strong)] text-[var(--muted)]"
            }`}
          >
            {isGestureMovementLocked ? <Lock className="size-3.5 text-[var(--accent)]" /> : <LockOpen className="size-3.5 text-[var(--accent)]" />}
            <span>{isGestureMovementLocked ? "Gestos bloqueados" : "Gestos liberados"}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsHelpOpen((current) => !current)}
            className={`inline-flex h-9 min-w-[108px] items-center justify-center gap-2 rounded-[5px] border px-3 py-2 text-xs transition ${
              isHelpOpen
                ? "border-[var(--accent)]/35 bg-[var(--accent)]/16 text-[var(--foreground)]"
                : "border-white/8 bg-[var(--panel-strong)] text-[var(--muted)]"
            }`}
          >
            <CircleHelp className="size-3.5 text-[var(--accent)]" />
            <span>Help</span>
          </button>
          <ToolbarChip icon={<Activity className="size-3.5" />} label={isConverting ? "Pipeline ativo" : "Pronto"} tone={isConverting ? "accent" : "neutral"} />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]">
            <Upload className="size-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            Importar planta
          </label>
        </div>
      </header>

      <section className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[240px_minmax(0,1fr)_300px] 2xl:grid-cols-[260px_minmax(0,1.2fr)_340px] min-[2200px]:grid-cols-[280px_minmax(0,1.45fr)_380px] min-[2600px]:grid-cols-[320px_minmax(0,1.7fr)_420px]">
        <aside className={`grid gap-3 xl:min-h-0 ${isHelpOpen ? "xl:grid-rows-[auto_auto]" : "xl:grid-rows-[auto]"}`}>
          <StandardCard eyebrow="Ferramentas" title="" description="Acesso rapido ao fluxo operacional." compact>
            <div className="min-h-6" />
          </StandardCard>

          {isHelpOpen ? (
            <StandardCard eyebrow="Navegacao" title="" description="Controle mapeado para gestos." compact>
              <div className="grid gap-2">
                <GestureLegendItem title="Pinca" description="Engata o controle principal." variant="pinch" />
                <GestureLegendItem title="Arrasto" description="Orbita da camera no palco." variant="drag" />
                <GestureLegendItem title="Giro" description="Rotacao livre da maquete." variant="twist" />
                <GestureLegendItem title="Zoom" description="Ajuste de distancia da camera." variant="zoom" />
              </div>
            </StandardCard>
          ) : null}
        </aside>

        <section className="order-first grid gap-3 xl:order-none xl:min-h-0">
          <div className="grid gap-3 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_340px] min-[2200px]:xl:grid-cols-[minmax(0,1fr)_380px] min-[2600px]:xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="glass-panel relative min-h-[420px] overflow-hidden rounded-[5px] p-2 xl:min-h-0">
              <button
                type="button"
                onClick={() => setIsViewerExpanded(true)}
                className="absolute bottom-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-white/10 bg-[rgba(11,16,22,0.82)] text-[var(--foreground)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)]"
                aria-label="Expandir maquete 3D"
                title="Expandir maquete 3D"
              >
                <Expand className="size-4" />
              </button>
              <ThreeHouseViewer planModel={planModel} gestureRef={gestureRef} gesturesLocked={isGestureMovementLocked} />
            </div>

            <div className="grid gap-3 content-start xl:min-h-0 xl:grid-rows-[auto_auto_minmax(0,1fr)]">
              <StandardCard eyebrow="Capture" title="" description="Retorno visual do tracking e das maos detectadas." compact>
                <div className="h-[180px] overflow-hidden rounded-[5px] xl:h-[170px]">
                  <GestureTracker onGesture={handleGesture} />
                </div>
              </StandardCard>

              <StandardCard eyebrow="Referencia" title="" description="Preview do arquivo atual no editor." compact>
                <div className="h-[235px] overflow-hidden rounded-[5px] border border-white/6 bg-[var(--panel-strong)]">
                  {planModel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={planModel.imageUrl} alt="Planta enviada" className="h-full w-full object-cover object-center" />
                  ) : (
                    <div className="flex h-full items-center justify-center gap-2 bg-[linear-gradient(135deg,#161d26,#232c36)] px-4 text-center text-sm text-[var(--muted)]">
                      <FileImage className="size-5 text-[var(--accent)]" />
                      <p>Nenhuma planta importada.</p>
                    </div>
                  )}
                </div>
              </StandardCard>

              <StandardCard eyebrow="Console" title="" description="Feedback operacional do ultimo processamento." compact>
                <div className="grid h-full min-h-0 gap-2 overflow-hidden">
                  <div className="stealth-scroll grid max-h-full gap-1.5 overflow-y-auto pr-1">
                    {consoleLogs.map((log) => (
                      <div key={log} className="rounded-[5px] border border-white/6 bg-[var(--panel-strong)] px-3 py-2.5">
                        <p className="text-xs leading-5 text-[var(--foreground)]">{log}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </StandardCard>
            </div>
          </div>
        </section>

        <aside className={`grid gap-3 xl:min-h-0 ${assetLibraryOpen ? "xl:grid-rows-[minmax(0,1fr)]" : ""}`}>
          {assetLibraryOpen ? (
            <StandardCard eyebrow="Biblioteca" title="" description="Selecione itens para futura insercao incremental na maquete." compact>
              <div className="library-scroll grid max-h-[70vh] gap-3 overflow-auto pr-1 xl:h-full xl:min-h-0 xl:max-h-none">
                {ASSET_LIBRARY.map((category) => (
                  <section key={category.id} className="rounded-[5px] border border-white/6 bg-[var(--panel)] p-2.5">
                    <div className="mb-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">{category.label}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">{category.description}</p>
                    </div>

                    <div className="grid gap-1.5">
                      {category.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[5px] border border-white/6 bg-[var(--panel-strong)] px-2.5 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs text-[var(--foreground)]">{item.label}</p>
                            <p className="mt-0.5 text-[10px] leading-4 text-[var(--muted)]">
                              {item.source} • {item.license}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-[5px] border border-white/8 px-2 py-1 text-[10px] text-[var(--muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--foreground)]"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                            <button
                              type="button"
                              aria-label={`Adicionar ${item.label}`}
                              title={`Adicionar ${item.label}`}
                              onClick={() => handleAssetSelect(item.id, item.label)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] border border-[var(--accent)]/35 bg-[var(--accent)]/16 text-[var(--accent)] transition hover:border-[var(--accent)]/55 hover:bg-[var(--accent)]/24"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </StandardCard>
          ) : (
            <>
              <StandardCard eyebrow="Signals" title="" description="Telemetria resumida do tracker em tempo real." compact>
                <div className="grid gap-2">
                  <SignalRow
                    label="Gestos"
                    value={
                      gestureHud.handDetected
                        ? `${gestureHud.detectedHands} mao(s)${gestureHud.gestureActive ? " / ativa" : ""}`
                        : "Aguardando"
                    }
                  />
                  <SignalRow label="Mao detectada" value={gestureHud.handDetected ? "Sim" : "Nao"} />
                  <SignalRow label="Maos simultaneas" value={String(gestureHud.detectedHands)} />
                  <SignalRow label="Pinch distance" value={gestureHud.pinchDistance.toFixed(3)} />
                  <SignalRow label="Rotation X" value={gestureHud.rotationDeltaX.toFixed(3)} />
                  <SignalRow label="Rotation Y" value={gestureHud.rotationDeltaY.toFixed(3)} />
                  <SignalRow label="Zoom delta" value={gestureHud.zoomDelta.toFixed(3)} />
                </div>
              </StandardCard>

              <StandardCard eyebrow="Stage" title="" description="Leitura compacta do palco e da camera." compact>
                <div className="grid grid-cols-2 gap-1.5">
                  <EditorBadge compact label="Resolucao" value={`${planModel.metrics.width} x ${planModel.metrics.height}`} />
                  <EditorBadge compact label="Escala" value={`${planModel.floorWidth.toFixed(1)}m x ${planModel.floorDepth.toFixed(1)}m`} />
                  <EditorBadge compact label="Hands" value={gestureHud.handDetected ? String(gestureHud.detectedHands) : "0"} />
                  <EditorBadge compact label="Estado" value={gestureHud.gestureActive ? "Pinch ativo" : "Observando"} />
                </div>
              </StandardCard>

              <StandardCard eyebrow="Inspector" title="" description="Importacao e metadados do desenho." compact>
                <div className="grid gap-1.5">
                  <div className="rounded-[5px] border border-white/6 bg-[var(--panel-strong)] px-2.5 py-2 text-sm text-[var(--muted)]">
                    <p className="text-[10px] uppercase tracking-[0.24em]">Origem</p>
                    <p className="mt-0.5 text-xs leading-4 text-[var(--foreground)]">{planModel.imageUrl ? "Arquivo carregado" : "Modelo padrao"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <StatLine label="Width" value={String(planModel.metrics.width)} compact />
                    <StatLine label="Height" value={String(planModel.metrics.height)} compact />
                    <StatLine label="Floor X" value={`${planModel.floorWidth.toFixed(1)}m`} compact />
                    <StatLine label="Floor Z" value={`${planModel.floorDepth.toFixed(1)}m`} compact />
                  </div>
                </div>
              </StandardCard>
            </>
          )}
        </aside>
      </section>

      {isViewerExpanded ? (
        <div className="fixed inset-0 z-[120] bg-[rgba(6,10,15,0.82)] p-3 backdrop-blur-sm">
          <div className="glass-panel flex h-full flex-col overflow-hidden rounded-[5px] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">Stage</p>
                <h2 className="mt-1 text-base font-medium">Maquete 3D expandida</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsViewerExpanded(false)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] border border-white/10 bg-[var(--panel-strong)] px-3 text-xs text-[var(--foreground)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)]"
              >
                <Minimize2 className="size-3.5" />
                <span>Fechar</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-[5px]">
              <ThreeHouseViewer planModel={planModel} gestureRef={gestureRef} gesturesLocked={isGestureMovementLocked} />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function StandardCard({
  eyebrow,
  title,
  description,
  children,
  action,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`glass-panel flex h-full flex-col overflow-hidden rounded-[5px] ${compact ? "p-3" : "p-4"} xl:min-h-0`}>
      <div className={`flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between ${compact ? "mb-3" : "mb-4"}`}>
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p>
          {title ? <h2 className={`mt-1 ${compact ? "text-base" : "text-lg"} font-medium`}>{title}</h2> : null}
          {description ? (
            <p className={`${title ? "mt-1" : "mt-0.5"} text-[var(--muted)] ${compact ? "text-xs leading-4" : "text-sm leading-5"}`}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function PanelFallback({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-[5px] border border-dashed border-white/10 bg-[var(--panel-strong)] px-4 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
        <p className="mt-2 text-sm text-[var(--foreground)]">{description}</p>
      </div>
    </div>
  );
}

function ToolbarChip({
  icon,
  label,
  tone,
}: {
  icon: ReactNode;
  label: string;
  tone: "neutral" | "accent";
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-2 text-xs ${
        tone === "accent"
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/14 text-[var(--foreground)]"
          : "border-white/8 bg-[var(--panel-strong)] text-[var(--muted)]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function EditorBadge({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-[5px] border border-white/6 bg-[var(--panel)] ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className={`mt-0.5 text-[var(--foreground)] ${compact ? "text-xs leading-4" : "text-sm"}`}>{value}</p>
    </div>
  );
}

function StatLine({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-[5px] border border-white/6 bg-[var(--panel-strong)] ${compact ? "px-2.5 py-1.5" : "px-3 py-3"}`}>
      <dt className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</dt>
      <dd className={`mt-0.5 text-[var(--foreground)] ${compact ? "text-sm leading-4" : "text-base"}`}>{value}</dd>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[5px] border border-white/6 bg-[var(--panel-strong)] px-2.5 py-1.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
      <span className="text-xs text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function GestureLegendItem({
  title,
  description,
  variant,
}: {
  title: string;
  description: string;
  variant: "pinch" | "drag" | "twist" | "zoom";
}) {
  return (
    <div className="grid grid-cols-[40px_1fr] items-center gap-2 rounded-[5px] border border-white/6 bg-[var(--panel-strong)] px-2 py-1.5">
      <GestureThumb variant={variant} />
      <div className="min-w-0">
        <p className="text-xs text-[var(--foreground)]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-3.5 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function GestureThumb({ variant }: { variant: "pinch" | "drag" | "twist" | "zoom" }) {
  return (
    <div className="relative h-[34px] overflow-hidden rounded-[5px] border border-white/6 bg-[linear-gradient(135deg,#111821,#1e2834)]">
      <div className="absolute inset-x-1 bottom-1 top-1 rounded-[4px] border border-dashed border-white/10" />
      {variant === "pinch" ? (
        <>
          <div className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--accent)]/70" />
          <div className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--accent)]/70" />
          <div className="absolute left-[10px] top-[16px] h-[1.5px] w-2 bg-[var(--accent)]" />
          <div className="absolute right-[10px] top-[16px] h-[1.5px] w-2 bg-[var(--accent)]" />
        </>
      ) : null}
      {variant === "drag" ? (
        <>
          <div className="absolute left-1.5 top-2 h-3.5 w-3.5 rounded-full bg-[var(--accent)]/20" />
          <div className="absolute left-5 top-[15px] h-[1.5px] w-4 bg-[var(--accent)]" />
          <div className="absolute right-1.5 top-[12px] border-y-[4px] border-l-[6px] border-y-transparent border-l-[var(--accent)]" />
        </>
      ) : null}
      {variant === "twist" ? (
        <>
          <div className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--accent)]/70" />
          <div className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--accent)]/30" />
          <div className="absolute left-2 top-0 text-[10px] text-[var(--accent)]">↺</div>
          <div className="absolute right-2 bottom-0 text-[10px] text-[var(--accent)]">↻</div>
        </>
      ) : null}
      {variant === "zoom" ? (
        <>
          <div className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--accent)]/70" />
          <div className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-[var(--accent)]/70" />
          <div className="absolute left-[10px] top-[13px] text-[8px] text-[var(--accent)]">+</div>
          <div className="absolute right-[10px] top-[13px] text-[8px] text-[var(--accent)]">-</div>
        </>
      ) : null}
    </div>
  );
}
