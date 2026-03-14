"use client";

import { Activity, CircleHelp, Copy, DraftingCompass, ExternalLink, FileImage, Grid3X3, Lock, LockOpen, MessageSquareText, Minimize2, Plus, Trash2, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import { ASSET_LIBRARY } from "@/lib/asset-library";
import { buildAssistantReply } from "@/lib/editor-assistant";
import { createGeneratedPlanModelFromPrompt, isPlanGenerationRequest } from "@/lib/generated-plan";
import { createPlanModelFromFile } from "@/lib/plan-to-model";
import { clampSceneObjectPosition, createSceneObjectFromAsset, findAssetById, snapPositionToGrid } from "@/lib/scene-assets";
import type { ArchitecturalFeatures, GestureFrame, SceneObject } from "@/lib/types";
import { useEditorStore } from "@/lib/use-editor-store";

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
  const {
    state,
    selectedObject,
    summary,
    activeFeatureCount,
    appendConsoleLog,
    setPlanModel,
    setIsConverting,
    toggleGestureMovementLocked,
    toggleHelp,
    setIsViewerExpanded,
    setGestureHud,
    setSceneObjects,
    setSelectedSceneObjectId,
    applyArchitecturalFeature,
    toggleSidePanel,
    addChatMessage,
    setChatDraft,
    toggleSnap,
    duplicateSelectedObject,
  } = useEditorStore();
  const {
    planModel,
    consoleLogs,
    isConverting,
    isGestureMovementLocked,
    isHelpOpen,
    isViewerExpanded,
    gestureHud,
    sceneObjects,
    selectedSceneObjectId,
    architecturalFeatures,
    sidePanelMode,
    chatMessages,
    chatDraft,
    snapEnabled,
  } = state;

  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setIsConverting(true);
      appendConsoleLog(`Importacao iniciada para ${file.name}.`);

      try {
        if (planModel.imageUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(planModel.imageUrl);
        }

        const nextModel = await createPlanModelFromFile(file);
        setPlanModel(nextModel);
        appendConsoleLog(`Planta ${file.name} convertida com sucesso em maquete 3D base.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao converter a planta.";
        appendConsoleLog(message);
      } finally {
        setIsConverting(false);
        event.target.value = "";
      }
    },
    [appendConsoleLog, planModel.imageUrl, setIsConverting, setPlanModel],
  );

  const handleGesture = useCallback((frame: GestureFrame) => {
    gestureRef.current = frame;

    const now = performance.now();
    if (now - lastHudRef.current > 120) {
      lastHudRef.current = now;
      setGestureHud(frame);
    }
  }, [setGestureHud]);

  const handleAssetSelect = useCallback(
    (assetId: string) => {
      const asset = findAssetById(assetId);
      if (!asset) {
        return;
      }

      if (asset.prototype.kind === "roof") {
        applyArchitecturalFeature("roofEnabled", "Telhado", true);
        return;
      }

      if (asset.prototype.kind === "door") {
        applyArchitecturalFeature("doorsEnabled", "Portas", true);
        return;
      }

      if (asset.prototype.kind === "window") {
        applyArchitecturalFeature("windowsEnabled", "Janelas", true);
        return;
      }

      const nextObject = createSceneObjectFromAsset(asset, sceneObjects.length, planModel);
      setSceneObjects([...sceneObjects, nextObject]);
      setSelectedSceneObjectId(nextObject.id);
      appendConsoleLog(`Objeto ${asset.label} inserido na maquete.`);
    },
    [appendConsoleLog, applyArchitecturalFeature, planModel, sceneObjects, setSceneObjects, setSelectedSceneObjectId],
  );

  const handleSceneObjectUpdate = useCallback(
    (id: string, patch: Partial<SceneObject>) => {
      setSceneObjects(
        sceneObjects.map((item) => {
          if (item.id !== id) {
            return item;
          }

          const nextPosition = patch.position
            ? clampSceneObjectPosition(
                snapEnabled
                  ? snapPositionToGrid({
                      x: patch.position.x,
                      y: 0,
                      z: patch.position.z,
                    })
                  : {
                      x: patch.position.x,
                      y: 0,
                      z: patch.position.z,
                    },
                planModel,
                item.placement,
              )
            : item.position;

          return {
            ...item,
            ...patch,
            position: nextPosition,
          };
        }),
      );
    },
    [planModel, sceneObjects, setSceneObjects, snapEnabled],
  );

  const moveSelectedObject = useCallback(
    (dx: number, dz: number) => {
      if (!selectedObject) {
        return;
      }

      handleSceneObjectUpdate(selectedObject.id, {
        position: {
          x: selectedObject.position.x + dx,
          y: 0,
          z: selectedObject.position.z + dz,
        },
      });
    },
    [handleSceneObjectUpdate, selectedObject],
  );

  const rotateSelectedObject = useCallback(
    (delta: number) => {
      if (!selectedObject) {
        return;
      }

      handleSceneObjectUpdate(selectedObject.id, {
        rotationY: selectedObject.rotationY + delta,
      });
    },
    [handleSceneObjectUpdate, selectedObject],
  );

  const scaleSelectedObject = useCallback(
    (delta: number) => {
      if (!selectedObject) {
        return;
      }

      handleSceneObjectUpdate(selectedObject.id, {
        scale: Math.min(Math.max(selectedObject.scale + delta, 0.55), 1.9),
      });
    },
    [handleSceneObjectUpdate, selectedObject],
  );

  const removeSelectedObject = useCallback(() => {
    if (!selectedObject) {
      return;
    }

    setSceneObjects(sceneObjects.filter((item) => item.id !== selectedObject.id));
    setSelectedSceneObjectId(null);
    appendConsoleLog(`Objeto ${selectedObject.label} removido da maquete.`);
  }, [appendConsoleLog, sceneObjects, selectedObject, setSceneObjects, setSelectedSceneObjectId]);

  const handleChatSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      const message = chatDraft.trim();
      if (!message) {
        return;
      }

      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      } as const;

      addChatMessage(userMessage);
      appendConsoleLog(`Chat: ${message}`);

      let reply = buildAssistantReply({
        message,
        planModel,
        sceneObjects,
        features: architecturalFeatures,
      });

      try {
        const response = await fetch("/api/editor-guide", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            plan: {
              sourceLabel: planModel.sourceLabel,
              floorWidth: planModel.floorWidth,
              floorDepth: planModel.floorDepth,
              metrics: planModel.metrics,
            },
            scene: {
              objectCount: sceneObjects.length,
              selectedObjectLabel: selectedObject?.label ?? null,
              activeFeatures: architecturalFeatures,
            },
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as { reply?: string };
          if (data.reply) {
            reply = {
              ...reply,
              reply: data.reply,
            };
          }
        }
      } catch {
        appendConsoleLog("Chat IA indisponivel. Mantendo guia local do editor.");
      }

      for (const intent of reply.intents) {
        if (intent.type === "open-library") {
          toggleSidePanel("library");
        }

        if (intent.type === "open-help" && !isHelpOpen) {
          toggleHelp();
        }

        if (intent.type === "toggle-snap" && intent.enabled !== snapEnabled) {
          toggleSnap();
          appendConsoleLog(`Snap ${intent.enabled ? "ativado" : "desativado"} pelo chat.`);
        }

        if (intent.type === "duplicate-selected") {
          duplicateSelectedObject();
        }

        if (intent.type === "remove-selected" && selectedObject) {
          removeSelectedObject();
        }

        if (intent.type === "generate-plan") {
          const generatedPlan = createGeneratedPlanModelFromPrompt(intent.prompt);
          setPlanModel(generatedPlan);
          setSceneObjects([]);
          setSelectedSceneObjectId(null);
          appendConsoleLog(`Nova planta 2D gerada via chat: ${generatedPlan.sourceLabel}.`);
        }

        if (intent.type === "toggle-feature") {
          const labels: Record<keyof ArchitecturalFeatures, string> = {
            roofEnabled: "Telhado",
            windowsEnabled: "Janelas",
            doorsEnabled: "Portas",
            gardenEnabled: "Jardim",
          };
          applyArchitecturalFeature(intent.feature, labels[intent.feature], intent.enabled);
        }

        if (intent.type === "add-asset") {
          handleAssetSelect(intent.assetId);
        }
      }

      if (reply.intents.length === 0 && isPlanGenerationRequest(message)) {
        const generatedPlan = createGeneratedPlanModelFromPrompt(message);
        setPlanModel(generatedPlan);
        setSceneObjects([]);
        setSelectedSceneObjectId(null);
        appendConsoleLog(`Nova planta 2D gerada via chat: ${generatedPlan.sourceLabel}.`);
      }

      const assistantMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content: reply.reply,
      } as const;

      addChatMessage(assistantMessage);
      setChatDraft("");
    },
    [
      addChatMessage,
      appendConsoleLog,
      architecturalFeatures,
      applyArchitecturalFeature,
      chatDraft,
      duplicateSelectedObject,
      handleAssetSelect,
      isHelpOpen,
      planModel,
      removeSelectedObject,
      sceneObjects,
      selectedObject,
      setChatDraft,
      setPlanModel,
      setSceneObjects,
      setSelectedSceneObjectId,
      snapEnabled,
      toggleHelp,
      toggleSidePanel,
      toggleSnap,
    ],
  );

  const isBusy = isConverting;

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
          <HeaderButton
            active={sidePanelMode === "library"}
            icon={<Plus className="size-3.5 text-[var(--accent)]" />}
            label="Biblioteca 3D"
            badge={sceneObjects.length}
            onClick={() => toggleSidePanel("library")}
          />
          <HeaderButton
            active={sidePanelMode === "chat"}
            icon={<MessageSquareText className="size-3.5 text-[var(--accent)]" />}
            label="Chat"
            onClick={() => toggleSidePanel("chat")}
          />
          <HeaderButton
            active={isGestureMovementLocked}
            icon={
              isGestureMovementLocked ? (
                <Lock className="size-3.5 text-[var(--accent)]" />
              ) : (
                <LockOpen className="size-3.5 text-[var(--accent)]" />
              )
            }
            label={isGestureMovementLocked ? "Gestos bloqueados" : "Gestos liberados"}
            onClick={toggleGestureMovementLocked}
            minWidthClass="min-w-[148px]"
          />
          <HeaderButton
            active={snapEnabled}
            icon={<Grid3X3 className="size-3.5 text-[var(--accent)]" />}
            label={snapEnabled ? "Snap ligado" : "Snap livre"}
            onClick={toggleSnap}
            minWidthClass="min-w-[124px]"
          />
          <HeaderButton
            active={isHelpOpen}
            icon={<CircleHelp className="size-3.5 text-[var(--accent)]" />}
            label="Help"
            onClick={toggleHelp}
            minWidthClass="min-w-[108px]"
          />
          <ToolbarChip icon={<Activity className="size-3.5" />} label={isConverting ? "Convertendo planta" : "Editor pronto"} tone={isBusy ? "accent" : "neutral"} />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[5px] bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]">
            <Upload className="size-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            Importar planta
          </label>
        </div>
      </header>

      <section className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[210px_minmax(0,1fr)_286px] 2xl:grid-cols-[228px_minmax(0,1.24fr)_310px] min-[2200px]:grid-cols-[248px_minmax(0,1.5fr)_340px] min-[2600px]:grid-cols-[272px_minmax(0,1.78fr)_372px]">
        <aside className={`grid gap-3 xl:min-h-0 ${isHelpOpen ? "xl:grid-rows-[auto_auto]" : "xl:grid-rows-[auto]"}`}>
          <StandardCard eyebrow="Ferramentas" title="" description="Fluxo principal de construcao da maquete." compact>
            <div className="grid gap-2">
              <FlowPill label="1. Importar planta" active />
              <FlowPill label="2. Converter para 3D" active={Boolean(planModel.sourceLabel)} />
              <FlowPill label="3. Inserir objetos" active={sceneObjects.length > 0} />
              <FlowPill label="4. Ajustar arquitetura" active={activeFeatureCount > 0} />
              <FlowPill label="5. Refinar maquete" active={sceneObjects.length > 0 || activeFeatureCount > 0} />
            </div>
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
          <div className="grid gap-3 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_300px] min-[2200px]:xl:grid-cols-[minmax(0,1fr)_328px] min-[2600px]:xl:grid-cols-[minmax(0,1fr)_356px]">
            <div className="glass-panel relative min-h-[460px] overflow-hidden rounded-[5px] p-2 xl:min-h-0">
              <ThreeHouseViewer
                planModel={planModel}
                gestureRef={gestureRef}
                gesturesLocked={isGestureMovementLocked}
                onExpand={() => setIsViewerExpanded(true)}
                sceneObjects={sceneObjects}
                selectedSceneObjectId={selectedSceneObjectId}
                architecturalFeatures={architecturalFeatures}
                onSelectSceneObject={setSelectedSceneObjectId}
                onUpdateSceneObject={handleSceneObjectUpdate}
                snapEnabled={snapEnabled}
              />
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

              <StandardCard eyebrow="Console" title="" description="Historico operacional do editor." compact>
                <div className="grid h-full min-h-0 gap-2 overflow-hidden">
                  <div className="stealth-scroll grid max-h-full gap-1.5 overflow-y-auto pr-1">
                    {consoleLogs.map((log) => (
                      <div key={log.id} className="rounded-[5px] border border-white/6 bg-[var(--panel-strong)] px-3 py-2.5">
                        <p className="text-xs leading-5 text-[var(--foreground)]">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </StandardCard>
            </div>
          </div>
        </section>

        <aside className={`grid gap-3 xl:min-h-0 ${sidePanelMode === "library" || sidePanelMode === "chat" ? "xl:grid-rows-[minmax(0,1fr)]" : ""}`}>
          {sidePanelMode === "library" ? (
            <StandardCard eyebrow="Biblioteca" title="" description="Selecione itens para inserir direto na maquete." compact>
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
                              onClick={() => handleAssetSelect(item.id)}
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
          ) : null}

          {sidePanelMode === "chat" ? (
            <StandardCard eyebrow="Chat" title="" description="Apoio guiado para construir e refinar a maquete." compact>
              <div className="flex h-full min-h-0 flex-col gap-3">
                <div className="stealth-scroll flex-1 space-y-2 overflow-y-auto pr-1">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-[5px] border px-3 py-2 text-xs leading-5 ${
                        message.role === "assistant"
                          ? "border-white/6 bg-[var(--panel)] text-[var(--foreground)]"
                          : "border-[var(--accent)]/20 bg-[var(--accent)]/12 text-[var(--foreground)]"
                      }`}
                    >
                      <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        {message.role === "assistant" ? "Guia" : "Voce"}
                      </p>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <QuickActionButton label="Gerar planta" onClick={() => setChatDraft("Criar planta 2D com 3 quartos, 2 banheiros, garagem e varanda")} />
                  <QuickActionButton label="Adicionar sofa" onClick={() => setChatDraft("Adicionar sofa na sala")} />
                  <QuickActionButton label="Ativar telhado" onClick={() => setChatDraft("Ativar telhado")} />
                  <QuickActionButton label="Inserir carro" onClick={() => setChatDraft("Adicionar carro compacto")} />
                  <QuickActionButton label="Proximo passo" onClick={() => setChatDraft("Como continuar refinando a maquete?")} />
                </div>

                <form onSubmit={handleChatSubmit} className="grid gap-2">
                  <textarea
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    rows={3}
                    placeholder="Exemplo: adicionar cadeira, ativar janelas, como comecar..."
                    className="rounded-[5px] border border-white/8 bg-[var(--panel-strong)] px-3 py-2 text-xs text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]/35"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-[5px] bg-[var(--accent)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                  >
                    Enviar ao guia
                  </button>
                </form>
              </div>
            </StandardCard>
          ) : null}

          {sidePanelMode === "default" ? (
            <>
              <StandardCard eyebrow="Signals" title="" description="Telemetria resumida do tracker e da maquete." compact>
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
                  <SignalRow label="Objetos" value={String(sceneObjects.length)} />
                  <SignalRow label="Selecionado" value={selectedObject ? selectedObject.label : "Nenhum"} />
                  <SignalRow label="Pinch distance" value={gestureHud.pinchDistance.toFixed(3)} />
                  <SignalRow label="Zoom delta" value={gestureHud.zoomDelta.toFixed(3)} />
                </div>
              </StandardCard>

              <StandardCard eyebrow="Stage" title="" description="Leitura compacta do palco e da camera." compact>
                <div className="grid grid-cols-2 gap-1.5">
                  <EditorBadge compact label="Resolucao" value={`${planModel.metrics.width} x ${planModel.metrics.height}`} />
                  <EditorBadge compact label="Escala" value={summary.footprint} />
                  <EditorBadge compact label="Hands" value={gestureHud.handDetected ? String(gestureHud.detectedHands) : "0"} />
                  <EditorBadge compact label="Recursos" value={String(activeFeatureCount)} />
                </div>
              </StandardCard>

              <StandardCard
                eyebrow="Inspector"
                title=""
                description={selectedObject ? "Edicao do item selecionado na maquete." : "Importacao, presets e resumo da cena."}
                compact
              >
                <div className="stealth-scroll h-full overflow-y-auto pr-1">
                  {selectedObject ? (
                    <div className="grid gap-2">
                      <div className="rounded-[5px] border border-white/6 bg-[var(--panel-strong)] px-2.5 py-2 text-sm text-[var(--muted)]">
                        <p className="text-[10px] uppercase tracking-[0.24em]">Objeto ativo</p>
                        <p className="mt-0.5 text-xs leading-4 text-[var(--foreground)]">{selectedObject.label}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <StatLine label="Pos X" value={selectedObject.position.x.toFixed(2)} compact />
                        <StatLine label="Pos Z" value={selectedObject.position.z.toFixed(2)} compact />
                        <StatLine label="Rot Y" value={selectedObject.rotationY.toFixed(2)} compact />
                        <StatLine label="Scale" value={selectedObject.scale.toFixed(2)} compact />
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <SmallActionButton label="Esq" onClick={() => moveSelectedObject(-0.6, 0)} />
                        <SmallActionButton label="Frente" onClick={() => moveSelectedObject(0, -0.6)} />
                        <SmallActionButton label="Dir" onClick={() => moveSelectedObject(0.6, 0)} />
                        <SmallActionButton label="Tras" onClick={() => moveSelectedObject(0, 0.6)} />
                        <SmallActionButton label="Rot -" onClick={() => rotateSelectedObject(-0.25)} />
                        <SmallActionButton label="Rot +" onClick={() => rotateSelectedObject(0.25)} />
                        <SmallActionButton label="Esc -" onClick={() => scaleSelectedObject(-0.08)} />
                        <SmallActionButton label="Esc +" onClick={() => scaleSelectedObject(0.08)} />
                        <SmallActionButton label="Centralizar" onClick={() => handleSceneObjectUpdate(selectedObject.id, { position: { x: 0, y: 0, z: 0 } })} />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={duplicateSelectedObject}
                          className="inline-flex h-8 items-center justify-center gap-2 rounded-[5px] border border-white/8 bg-[var(--panel)] px-3 text-[11px] text-[var(--foreground)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)]"
                        >
                          <Copy className="size-3.5" />
                          <span>Duplicar</span>
                        </button>
                        <button
                          type="button"
                          onClick={removeSelectedObject}
                          className="inline-flex h-8 items-center justify-center gap-2 rounded-[5px] border border-white/8 bg-[var(--panel)] px-3 text-[11px] text-[var(--foreground)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)]"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="grid gap-1.5">
                        <SignalRow label="Origem" value={planModel.sourceLabel} />
                        <SignalRow label="Width" value={String(planModel.metrics.width)} />
                        <SignalRow label="Height" value={String(planModel.metrics.height)} />
                        <SignalRow label="Objetos" value={String(summary.objectCount)} />
                      </div>

                      <div className="grid gap-1.5">
                        <FeatureToggleRow
                          label="Telhado"
                          active={architecturalFeatures.roofEnabled}
                          onClick={() => applyArchitecturalFeature("roofEnabled", "Telhado", !architecturalFeatures.roofEnabled)}
                        />
                        <FeatureToggleRow
                          label="Portas"
                          active={architecturalFeatures.doorsEnabled}
                          onClick={() => applyArchitecturalFeature("doorsEnabled", "Portas", !architecturalFeatures.doorsEnabled)}
                        />
                        <FeatureToggleRow
                          label="Janelas"
                          active={architecturalFeatures.windowsEnabled}
                          onClick={() => applyArchitecturalFeature("windowsEnabled", "Janelas", !architecturalFeatures.windowsEnabled)}
                        />
                        <FeatureToggleRow
                          label="Jardim"
                          active={architecturalFeatures.gardenEnabled}
                          onClick={() => applyArchitecturalFeature("gardenEnabled", "Jardim", !architecturalFeatures.gardenEnabled)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </StandardCard>
            </>
          ) : null}
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
              <ThreeHouseViewer
                planModel={planModel}
                gestureRef={gestureRef}
                gesturesLocked={isGestureMovementLocked}
                sceneObjects={sceneObjects}
                selectedSceneObjectId={selectedSceneObjectId}
                architecturalFeatures={architecturalFeatures}
                onSelectSceneObject={setSelectedSceneObjectId}
                onUpdateSceneObject={handleSceneObjectUpdate}
                snapEnabled={snapEnabled}
              />
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

function HeaderButton({
  active,
  icon,
  label,
  onClick,
  badge,
  minWidthClass = "min-w-[132px]",
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  minWidthClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 ${minWidthClass} items-center justify-center gap-2 rounded-[5px] border px-3 py-2 text-xs transition ${
        active ? "border-[var(--accent)]/35 bg-[var(--accent)]/16 text-[var(--foreground)]" : "border-white/8 bg-[var(--panel-strong)] text-[var(--muted)]"
      }`}
    >
      {icon}
      <span>{label}</span>
      {typeof badge === "number" ? <span className="rounded-[4px] bg-white/6 px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">{badge}</span> : null}
    </button>
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

function FlowPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`rounded-[5px] border px-3 py-2 text-xs ${active ? "border-[var(--accent)]/32 bg-[var(--accent)]/14 text-[var(--foreground)]" : "border-white/6 bg-[var(--panel-strong)] text-[var(--muted)]"}`}>
      {label}
    </div>
  );
}

function QuickActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center justify-center rounded-[5px] border border-white/8 bg-[var(--panel)] px-2.5 text-[10px] text-[var(--muted)] transition hover:border-[var(--accent)]/35 hover:text-[var(--foreground)]"
    >
      {label}
    </button>
  );
}

function SmallActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center rounded-[5px] border border-white/8 bg-[var(--panel)] px-2 text-[10px] text-[var(--foreground)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)]"
    >
      {label}
    </button>
  );
}

function FeatureToggleRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-[5px] border px-2.5 py-1.5 transition ${
        active ? "border-[var(--accent)]/35 bg-[var(--accent)]/14 text-[var(--foreground)]" : "border-white/6 bg-[var(--panel-strong)] text-[var(--muted)]"
      }`}
    >
      <span className="text-[10px] uppercase tracking-[0.16em]">{label}</span>
      <span className="text-xs text-[var(--foreground)]">{active ? "Ativo" : "Desligado"}</span>
    </button>
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
