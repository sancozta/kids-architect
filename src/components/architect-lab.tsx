"use client";

import { DraftingCompass, FileImage, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { DEFAULT_PLAN_MODEL } from "@/lib/default-plan";
import { createPlanModelFromFile } from "@/lib/plan-to-model";
import type { GestureFrame, PlanModel } from "@/lib/types";

const GestureTracker = dynamic(
  () => import("@/components/gesture-tracker").then((module) => module.GestureTracker),
  { ssr: false },
);

const ThreeHouseViewer = dynamic(
  () => import("@/components/three-house-viewer").then((module) => module.ThreeHouseViewer),
  { ssr: false },
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
  const [status, setStatus] = useState("Usando planta de exemplo para validar a experiencia inicial.");
  const [isConverting, setIsConverting] = useState(false);
  const [gestureHud, setGestureHud] = useState(EMPTY_GESTURE);

  const handleUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsConverting(true);
    setStatus(`Convertendo ${file.name} em uma massa 3D heuristica...`);

    try {
      setPlanModel((current) => {
        if (current.imageUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(current.imageUrl);
        }
        return current;
      });

      const nextModel = await createPlanModelFromFile(file);
      setPlanModel(nextModel);
      setStatus("Planta convertida. A camera ja pode controlar rotacao e zoom por gesto de pinca.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao converter a planta.");
    } finally {
      setIsConverting(false);
      event.target.value = "";
    }
  }, []);

  const handleGesture = useCallback((frame: GestureFrame) => {
    gestureRef.current = frame;

    const now = performance.now();
    if (now - lastHudRef.current > 120) {
      lastHudRef.current = now;
      setGestureHud(frame);
    }
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,0.95fr)]">
        <StandardCard
          eyebrow="Interacao"
          title="Legenda de gestos"
          description="Cards compactos para o vocabulário atual e próximos gestos."
          compact
        >
          <div className="grid gap-3">
            <GestureLegendItem
              title="Pinca"
              description="Ativa o controle principal."
              variant="pinch"
            />
            <GestureLegendItem
              title="Arrasto"
              description="Move a camera em orbita."
              variant="drag"
            />
            <GestureLegendItem
              title="Giro"
              description="Rotaciona a maquete em 360 graus."
              variant="twist"
            />
            <GestureLegendItem
              title="Zoom"
              description="Aproxima ou afasta a mao da camera."
              variant="zoom"
            />
          </div>
        </StandardCard>

        <StandardCard
          eyebrow="Captura"
          title="Camera"
          description="Use a webcam para validar o reconhecimento da mao e ativar o pinch."
        >
          <GestureTracker onGesture={handleGesture} />
        </StandardCard>

        <div className="grid gap-6">
          <StandardCard
            eyebrow="Visualizacao"
            title="Projecao da planta"
            description="A maquete 3D reage a rotacao e zoom conforme os gestos detectados."
          >
            <ThreeHouseViewer planModel={planModel} gestureRef={gestureRef} />
          </StandardCard>

          <StandardCard
            eyebrow="Entrada"
            title="Upload da planta 2D"
            description="Card compacto para trocar a planta base."
            compact
            action={
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                Selecionar
              </label>
            }
          >
            <div className="grid gap-3">
              <div className="rounded-[1.2rem] border border-black/8 bg-white/60 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Status</p>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{status}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-[var(--muted)]">
                <StatLine label="Resolucao" value={`${planModel.metrics.width} x ${planModel.metrics.height}`} compact />
                <StatLine label="Escala" value={`${planModel.floorWidth.toFixed(1)}m x ${planModel.floorDepth.toFixed(1)}m`} compact />
                <StatLine label="Paredes" value={String(planModel.metrics.wallCount)} compact />
                <StatLine
                  label="Gestos"
                  value={
                    gestureHud.handDetected
                      ? `${gestureHud.detectedHands} mao(s)${gestureHud.gestureActive ? " / ativa" : ""}`
                      : "Aguardando"
                  }
                  compact
                />
              </div>
              <div className="overflow-hidden rounded-[1.2rem] border border-black/8 bg-white/70">
                {planModel.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={planModel.imageUrl} alt="Planta enviada" className="h-32 w-full object-contain" />
                ) : (
                  <div className="flex h-32 items-center justify-center gap-2 bg-[linear-gradient(135deg,#f7f0e7,#efe1ce)] px-4 text-center text-sm text-[var(--muted)]">
                    <FileImage className="size-5 text-[var(--accent)]" />
                    <p>Sem upload.</p>
                  </div>
                )}
              </div>
            </div>
          </StandardCard>
        </div>
      </section>

      <section className="glass-panel rounded-[2.4rem] px-6 py-7 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs uppercase tracking-[0.32em] text-[var(--accent-strong)]">Hunt Architect POC</p>
            <h1 className="max-w-4xl text-4xl leading-tight md:text-6xl">
              Plantas 2D virando volume 3D navegavel com a mao.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
              Esta prova de conceito valida o fluxo principal: receber uma planta baixa, gerar uma massa 3D inicial
              e controlar a cena com pinch gesture via webcam.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Modo atual" value={isConverting ? "Convertendo" : "Interativo"} icon={<Sparkles className="size-4" />} />
            <MetricCard label="Paredes detectadas" value={String(planModel.metrics.wallCount)} icon={<DraftingCompass className="size-4" />} />
            <MetricCard label="Cobertura" value={`${Math.round(planModel.metrics.coverage * 100)}%`} icon={<FileImage className="size-4" />} />
          </div>
        </div>
      </section>
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
    <div className={`glass-panel flex h-full flex-col rounded-[2rem] ${compact ? "p-4" : "p-5"}`}>
      <div className={`flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between ${compact ? "mb-4" : "mb-5"}`}>
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p>
          <h2 className={`mt-2 ${compact ? "text-xl" : "text-2xl"}`}>{title}</h2>
          <p className={`mt-2 text-[var(--muted)] ${compact ? "text-xs leading-5" : "text-sm leading-6"}`}>{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/8 bg-white/60 px-4 py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl">{value}</p>
    </div>
  );
}

function StatLine({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-[1rem] bg-[#fff8f1] ${compact ? "px-3 py-2" : "px-3 py-3"}`}>
      <dt className="text-xs uppercase tracking-[0.2em]">{label}</dt>
      <dd className={`mt-2 text-[var(--foreground)] ${compact ? "text-sm leading-5" : "text-base"}`}>{value}</dd>
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
    <div className="grid grid-cols-[72px_1fr] gap-3 rounded-[1.1rem] border border-black/8 bg-white/60 p-3">
      <GestureThumb variant={variant} />
      <div className="min-w-0">
        <p className="text-sm text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function GestureThumb({ variant }: { variant: "pinch" | "drag" | "twist" | "zoom" }) {
  return (
    <div className="relative h-[72px] overflow-hidden rounded-[0.95rem] border border-black/8 bg-[linear-gradient(135deg,#f6ebdd,#efe5d8)]">
      <div className="absolute inset-x-3 bottom-2 top-2 rounded-[0.75rem] border border-dashed border-black/10" />
      {variant === "pinch" ? (
        <>
          <div className="absolute left-5 top-4 h-9 w-9 rounded-full border-2 border-[var(--accent)]/60" />
          <div className="absolute right-5 top-4 h-9 w-9 rounded-full border-2 border-[var(--accent)]/60" />
          <div className="absolute left-[30px] top-[31px] h-[2px] w-4 bg-[var(--accent)]" />
          <div className="absolute right-[30px] top-[31px] h-[2px] w-4 bg-[var(--accent)]" />
        </>
      ) : null}
      {variant === "drag" ? (
        <>
          <div className="absolute left-4 top-5 h-8 w-8 rounded-full bg-[var(--accent)]/20" />
          <div className="absolute left-10 top-8 h-[2px] w-10 bg-[var(--accent)]" />
          <div className="absolute right-4 top-[27px] border-y-[6px] border-l-[10px] border-y-transparent border-l-[var(--accent)]" />
        </>
      ) : null}
      {variant === "twist" ? (
        <>
          <div className="absolute left-5 top-4 h-9 w-9 rounded-full border-2 border-[var(--accent)]/60" />
          <div className="absolute right-5 top-4 h-9 w-9 rounded-full border-2 border-[var(--accent)]/20" />
          <div className="absolute left-8 top-2 text-lg text-[var(--accent)]">↺</div>
          <div className="absolute right-8 bottom-1 text-lg text-[var(--accent)]">↻</div>
        </>
      ) : null}
      {variant === "zoom" ? (
        <>
          <div className="absolute left-5 top-4 h-9 w-9 rounded-full border-2 border-[var(--accent)]/60" />
          <div className="absolute right-5 top-4 h-9 w-9 rounded-full border-2 border-[var(--accent)]/60" />
          <div className="absolute left-[31px] top-[31px] text-xs text-[var(--accent)]">+</div>
          <div className="absolute right-[31px] top-[31px] text-xs text-[var(--accent)]">-</div>
        </>
      ) : null}
    </div>
  );
}
