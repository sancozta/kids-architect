import { ASSET_LIBRARY } from "@/lib/asset-library";
import type { ArchitecturalFeatures, PlanModel, SceneObject } from "@/lib/types";

type AssistantContext = {
  message: string;
  planModel: PlanModel;
  sceneObjects: SceneObject[];
  features: ArchitecturalFeatures;
};

export type AssistantIntent =
  | { type: "open-library" }
  | { type: "toggle-feature"; feature: keyof ArchitecturalFeatures; enabled: boolean }
  | { type: "add-asset"; assetId: string };

export type AssistantReply = {
  reply: string;
  intents: AssistantIntent[];
};

export function buildAssistantReply({ message, planModel, sceneObjects, features }: AssistantContext): AssistantReply {
  const normalized = normalize(message);
  const intents: AssistantIntent[] = [];

  if (containsAny(normalized, ["biblioteca", "objeto", "mobilia", "mobiliario"])) {
    intents.push({ type: "open-library" });
  }

  if (containsAny(normalized, ["telhado", "cobertura"])) {
    intents.push({ type: "toggle-feature", feature: "roofEnabled", enabled: true });
  }

  if (containsAny(normalized, ["porta", "portas"])) {
    intents.push({ type: "toggle-feature", feature: "doorsEnabled", enabled: true });
  }

  if (containsAny(normalized, ["janela", "janelas"])) {
    intents.push({ type: "toggle-feature", feature: "windowsEnabled", enabled: true });
  }

  if (containsAny(normalized, ["jardim", "externo", "paisagismo"])) {
    intents.push({ type: "toggle-feature", feature: "gardenEnabled", enabled: true });
  }

  for (const category of ASSET_LIBRARY) {
    for (const item of category.items) {
      const itemLabel = normalize(item.label);
      const simplified = itemLabel.replace(/\s+/g, " ");
      if (normalized.includes(simplified) || normalized.includes(normalize(item.id.replace(/-/g, " ")))) {
        intents.push({ type: "add-asset", assetId: item.id });
        break;
      }
    }
  }

  if (containsAny(normalized, ["como comecar", "comecar", "inicio", "ajuda"])) {
    return {
      reply:
        "Comece importando a planta 2D, valide a maquete base no viewport, ative telhado/portas/janelas no inspector e depois use a Biblioteca 3D para compor ambientes e area externa.",
      intents,
    };
  }

  if (containsAny(normalized, ["pdf", "relatorio", "exportar"])) {
    return {
      reply:
        "A exportacao em PDF saiu da interface atual. Por agora, foque em organizar a maquete, ajustar arquitetura e posicionar bem os objetos na cena.",
      intents,
    };
  }

  if (intents.length > 0) {
    return {
      reply: `Acionei ${formatIntentSummary(intents)}. Agora revise o viewport, o inspector e o console para continuar refinando a maquete.`,
      intents,
    };
  }

  return {
    reply: `Seu projeto atual tem ${sceneObjects.length} objetos inseridos, com ${
      Number(features.roofEnabled) + Number(features.windowsEnabled) + Number(features.doorsEnabled) + Number(features.gardenEnabled)
    } recursos arquitetonicos ativos, sobre uma base de ${planModel.floorWidth.toFixed(1)}m x ${planModel.floorDepth.toFixed(1)}m. Posso te ajudar a adicionar mobilia, ligar telhado, portas, janelas ou orientar o proximo refinamento da maquete.`,
    intents: [],
  };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function containsAny(message: string, terms: string[]) {
  return terms.some((term) => message.includes(normalize(term)));
}

function formatIntentSummary(intents: AssistantIntent[]) {
  const unique = new Set(
    intents.map((intent) => {
      if (intent.type === "add-asset") {
        return "insercao de objetos";
      }

      if (intent.type === "open-library") {
        return "abertura da biblioteca";
      }

      return "ajuste arquitetonico";
    }),
  );

  return Array.from(unique).join(", ");
}
