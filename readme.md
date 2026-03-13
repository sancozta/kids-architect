# Hunt Architect

POC isolada para validar uma nova experiencia do ecossistema HUNT: envio de planta 2D, geracao de uma massa 3D inicial e navegacao por gestos de mao.

## Escopo desta POC

- Upload de imagem de planta baixa
- Conversao heuristica de linhas escuras em segmentos de parede extrudados
- Viewer 3D em WebGL com orbita e zoom
- Controle por gestos usando webcam e MediaPipe Hands

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Limites atuais

- A conversao 2D para 3D ainda e heuristica, nao semantica
- O modelo resultante e uma massa arquitetonica, nao uma casa completa com portas, telhado e mobiliario
- O tracking usa um gesto simples de pinca para priorizar estabilidade na validacao inicial
