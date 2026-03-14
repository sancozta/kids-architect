import type { ArchitecturalFeatures, PlanModel, ReportSnapshot, SceneObject } from "@/lib/types";

type ReportInput = {
  planModel: PlanModel;
  snapshots: ReportSnapshot[];
  sceneObjects: SceneObject[];
  features: ArchitecturalFeatures;
};

export function buildPrintableReport({ planModel, snapshots, sceneObjects, features }: ReportInput) {
  const summary = [
    `Origem: ${escapeHtml(planModel.sourceLabel)}`,
    `Escala base: ${planModel.floorWidth.toFixed(1)}m x ${planModel.floorDepth.toFixed(1)}m`,
    `Objetos inseridos: ${sceneObjects.length}`,
    `Recursos arquitetonicos: ${formatFeatures(features)}`,
  ];

  const planBlock = planModel.imageUrl
    ? `<div class="plan-card"><h3>Planta 2D de referencia</h3><img src="${planModel.imageUrl}" alt="Planta 2D" /></div>`
    : "";

  const snapshotsHtml = snapshots
    .map(
      (snapshot) => `
        <article class="snapshot-card">
          <h3>${escapeHtml(snapshot.label)}</h3>
          <img src="${snapshot.dataUrl}" alt="${escapeHtml(snapshot.label)}" />
        </article>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatorio visual - Kids Architect</title>
        <style>
          body {
            margin: 0;
            padding: 32px;
            font-family: "Avenir Next", "Segoe UI", sans-serif;
            color: #111827;
            background: #f5f1ea;
          }

          h1, h2, h3, p {
            margin: 0;
          }

          .header {
            margin-bottom: 24px;
            padding: 24px;
            border-radius: 16px;
            background: linear-gradient(135deg, #111821, #222d38);
            color: #f8fafc;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 18px;
          }

          .summary-item {
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.08);
            font-size: 13px;
            line-height: 1.5;
          }

          .plan-card,
          .snapshot-card {
            break-inside: avoid;
            margin-bottom: 18px;
            padding: 16px;
            border-radius: 14px;
            background: #ffffff;
            box-shadow: 0 12px 32px rgba(17, 24, 39, 0.08);
          }

          .plan-card img,
          .snapshot-card img {
            width: 100%;
            margin-top: 12px;
            border-radius: 10px;
            object-fit: cover;
            background: #e5e7eb;
          }

          .snapshot-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }

          @media print {
            body {
              padding: 14mm;
              background: white;
            }
          }
        </style>
      </head>
      <body>
        <section class="header">
          <p>Kids Architect</p>
          <h1>Relatorio visual da maquete</h1>
          <div class="summary">
            ${summary.map((entry) => `<div class="summary-item">${entry}</div>`).join("")}
          </div>
        </section>

        ${planBlock}

        <section class="snapshot-grid">
          ${snapshotsHtml}
        </section>
      </body>
    </html>
  `;
}

function formatFeatures(features: ArchitecturalFeatures) {
  const active: string[] = [];

  if (features.roofEnabled) active.push("telhado");
  if (features.windowsEnabled) active.push("janelas");
  if (features.doorsEnabled) active.push("portas");
  if (features.gardenEnabled) active.push("jardim");

  return active.length ? active.join(", ") : "nenhum preset ativo";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
