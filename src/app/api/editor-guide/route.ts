import { NextResponse } from "next/server";

type RequestPayload = {
  message: string;
  plan: {
    sourceLabel: string;
    floorWidth: number;
    floorDepth: number;
    metrics: {
      width: number;
      height: number;
      wallCount: number;
      coverage: number;
    };
  };
  scene: {
    objectCount: number;
    selectedObjectLabel: string | null;
    activeFeatures: {
      roofEnabled: boolean;
      windowsEnabled: boolean;
      doorsEnabled: boolean;
      gardenEnabled: boolean;
    };
  };
};

const SYSTEM_PROMPT = `
Voce e o guia do produto Kids Architect Editor.
Responda em portugues do Brasil.
Seu papel e orientar usuarios leigos a montar uma maquete 3D a partir de uma planta 2D.
Seja direto, pratico e orientado ao proximo passo.
Nao invente funcionalidades que nao existam.
Foque em orientar o uso da planta, da biblioteca 3D, dos presets arquitetonicos, do viewport e do controle gestual.
Responda em texto simples, curto e acionavel.
`.trim();

export async function POST(request: Request) {
  let payload: RequestPayload;

  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload.message?.trim()) {
    return NextResponse.json({ error: "Mensagem obrigatoria." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY ausente." }, { status: 503 });
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const prompt = `
Mensagem do usuario:
${payload.message}

Contexto do projeto:
- Origem da planta: ${payload.plan.sourceLabel}
- Base da maquete: ${payload.plan.floorWidth.toFixed(1)}m x ${payload.plan.floorDepth.toFixed(1)}m
- Objetos inseridos: ${payload.scene.objectCount}
- Objeto selecionado: ${payload.scene.selectedObjectLabel ?? "nenhum"}
- Recursos ativos: telhado=${payload.scene.activeFeatures.roofEnabled}, janelas=${payload.scene.activeFeatures.windowsEnabled}, portas=${payload.scene.activeFeatures.doorsEnabled}, jardim=${payload.scene.activeFeatures.gardenEnabled}

Responda com no maximo 3 frases curtas, orientando o proximo passo do usuario dentro do editor atual.
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SYSTEM_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText || "Falha na chamada ao modelo." }, { status: 502 });
  }

  const data = (await response.json()) as { output_text?: string };
  return NextResponse.json({ reply: data.output_text?.trim() || "Posso te orientar a seguir pela biblioteca, ajustar os presets arquitetonicos e posicionar melhor os objetos na maquete." });
}
