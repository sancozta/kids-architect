import { useCallback, useMemo, useReducer } from "react";

import { DEFAULT_PLAN_MODEL } from "@/lib/default-plan";
import { duplicateSceneObject, summarizeProject } from "@/lib/scene-assets";
import type {
  ArchitecturalFeatures,
  ChatMessage,
  ConsoleLogEntry,
  GestureFrame,
  PlanModel,
  SceneObject,
} from "@/lib/types";

export type SidePanelMode = "default" | "library" | "chat";

type EditorState = {
  planModel: PlanModel;
  consoleLogs: ConsoleLogEntry[];
  isConverting: boolean;
  isGestureMovementLocked: boolean;
  isHelpOpen: boolean;
  isViewerExpanded: boolean;
  gestureHud: GestureFrame;
  sceneObjects: SceneObject[];
  selectedSceneObjectId: string | null;
  architecturalFeatures: ArchitecturalFeatures;
  sidePanelMode: SidePanelMode;
  chatMessages: ChatMessage[];
  chatDraft: string;
  snapEnabled: boolean;
};

type EditorAction =
  | { type: "append_log"; message: string }
  | { type: "set_plan_model"; planModel: PlanModel }
  | { type: "set_converting"; value: boolean }
  | { type: "toggle_gesture_lock" }
  | { type: "toggle_help" }
  | { type: "set_viewer_expanded"; value: boolean }
  | { type: "set_gesture_hud"; frame: GestureFrame }
  | { type: "set_scene_objects"; sceneObjects: SceneObject[] }
  | { type: "set_selected_scene_object_id"; id: string | null }
  | { type: "set_feature"; feature: keyof ArchitecturalFeatures; enabled: boolean }
  | { type: "toggle_side_panel"; mode: SidePanelMode }
  | { type: "add_chat_message"; message: ChatMessage }
  | { type: "set_chat_draft"; value: string }
  | { type: "toggle_snap" };

const INITIAL_FEATURES: ArchitecturalFeatures = {
  roofEnabled: false,
  windowsEnabled: false,
  doorsEnabled: false,
  gardenEnabled: false,
};

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

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "assistant-init",
    role: "assistant",
    content:
      "Posso te orientar na criacao da maquete. Tente pedir algo como: adicionar sofa, ativar telhado, ligar janelas ou explicar o proximo passo do projeto.",
  },
];

const INITIAL_STATE: EditorState = {
  planModel: DEFAULT_PLAN_MODEL,
  consoleLogs: [{ id: "boot-log", message: "Workspace inicializado com a maquete base do editor." }],
  isConverting: false,
  isGestureMovementLocked: false,
  isHelpOpen: false,
  isViewerExpanded: false,
  gestureHud: EMPTY_GESTURE,
  sceneObjects: [],
  selectedSceneObjectId: null,
  architecturalFeatures: INITIAL_FEATURES,
  sidePanelMode: "default",
  chatMessages: INITIAL_CHAT,
  chatDraft: "",
  snapEnabled: true,
};

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "append_log":
      return {
        ...state,
        consoleLogs: [{ id: `${Date.now()}-${state.consoleLogs.length}`, message: action.message }, ...state.consoleLogs].slice(0, 24),
      };
    case "set_plan_model":
      return { ...state, planModel: action.planModel };
    case "set_converting":
      return { ...state, isConverting: action.value };
    case "toggle_gesture_lock":
      return { ...state, isGestureMovementLocked: !state.isGestureMovementLocked };
    case "toggle_help":
      return { ...state, isHelpOpen: !state.isHelpOpen };
    case "set_viewer_expanded":
      return { ...state, isViewerExpanded: action.value };
    case "set_gesture_hud":
      return { ...state, gestureHud: action.frame };
    case "set_scene_objects":
      return { ...state, sceneObjects: action.sceneObjects };
    case "set_selected_scene_object_id":
      return { ...state, selectedSceneObjectId: action.id };
    case "set_feature":
      return {
        ...state,
        architecturalFeatures: {
          ...state.architecturalFeatures,
          [action.feature]: action.enabled,
        },
      };
    case "toggle_side_panel":
      return {
        ...state,
        sidePanelMode: state.sidePanelMode === action.mode ? "default" : action.mode,
      };
    case "add_chat_message":
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message],
      };
    case "set_chat_draft":
      return {
        ...state,
        chatDraft: action.value,
      };
    case "toggle_snap":
      return {
        ...state,
        snapEnabled: !state.snapEnabled,
      };
    default:
      return state;
  }
}

export function useEditorStore() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const selectedObject = state.sceneObjects.find((item) => item.id === state.selectedSceneObjectId) ?? null;
  const summary = useMemo(() => summarizeProject(state.planModel, state.sceneObjects, state.architecturalFeatures), [state.planModel, state.sceneObjects, state.architecturalFeatures]);
  const activeFeatureCount =
    Number(state.architecturalFeatures.roofEnabled) +
    Number(state.architecturalFeatures.windowsEnabled) +
    Number(state.architecturalFeatures.doorsEnabled) +
    Number(state.architecturalFeatures.gardenEnabled);

  const appendConsoleLog = useCallback((message: string) => {
    dispatch({ type: "append_log", message });
  }, []);

  const setPlanModel = useCallback((planModel: PlanModel) => {
    dispatch({ type: "set_plan_model", planModel });
  }, []);

  const setIsConverting = useCallback((value: boolean) => {
    dispatch({ type: "set_converting", value });
  }, []);

  const toggleGestureMovementLocked = useCallback(() => {
    dispatch({ type: "toggle_gesture_lock" });
  }, []);

  const toggleHelp = useCallback(() => {
    dispatch({ type: "toggle_help" });
  }, []);

  const setIsViewerExpanded = useCallback((value: boolean) => {
    dispatch({ type: "set_viewer_expanded", value });
  }, []);

  const setGestureHud = useCallback((frame: GestureFrame) => {
    dispatch({ type: "set_gesture_hud", frame });
  }, []);

  const setSceneObjects = useCallback((sceneObjects: SceneObject[]) => {
    dispatch({ type: "set_scene_objects", sceneObjects });
  }, []);

  const setSelectedSceneObjectId = useCallback((id: string | null) => {
    dispatch({ type: "set_selected_scene_object_id", id });
  }, []);

  const applyArchitecturalFeature = useCallback((feature: keyof ArchitecturalFeatures, label: string, enabled: boolean) => {
    dispatch({ type: "set_feature", feature, enabled });
    dispatch({ type: "append_log", message: `${label} ${enabled ? "ativado" : "desativado"} na maquete.` });
  }, []);

  const toggleSidePanel = useCallback((mode: SidePanelMode) => {
    dispatch({ type: "toggle_side_panel", mode });
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: "add_chat_message", message });
  }, []);

  const setChatDraft = useCallback((value: string) => {
    dispatch({ type: "set_chat_draft", value });
  }, []);

  const toggleSnap = useCallback(() => {
    dispatch({ type: "toggle_snap" });
  }, []);

  const duplicateSelectedObject = useCallback(() => {
    if (!selectedObject) {
      return null;
    }

    const nextObject = duplicateSceneObject(selectedObject, state.planModel);
    dispatch({ type: "set_scene_objects", sceneObjects: [...state.sceneObjects, nextObject] });
    dispatch({ type: "set_selected_scene_object_id", id: nextObject.id });
    dispatch({ type: "append_log", message: `Objeto ${selectedObject.label} duplicado.` });
    return nextObject;
  }, [selectedObject, state.planModel, state.sceneObjects]);

  return {
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
  };
}
