# Kids Architect - Diretrizes de Produto e Desenvolvimento

## Fonte de verdade
- Toda diretriz de desenvolvimento, instrução de produto, escopo funcional e decisão de fluxo deve ser registrada neste arquivo.
- Novas funcionalidades devem ser avaliadas contra este documento antes de serem implementadas.
- Quando houver mudança de visão do produto, este arquivo deve ser atualizado primeiro.

## Objetivo do produto
- Democratizar a visualizacao 3D de projetos residenciais.
- Permitir que pessoas sem conhecimento tecnico avancado em engenharia ou arquitetura consigam transformar uma planta 2D em uma maquete 3D navegavel.
- Reduzir a barreira entre ideia, planta e visualizacao espacial da construcao.

## Fluxo principal desejado
1. O usuario cria ou obtém uma planta 2D em formato de imagem.
2. Essa planta pode ser criada dentro da aplicacao via chat ou em um chat externo, como ChatGPT.
3. O usuario importa a imagem da planta 2D para o editor.
4. A aplicacao converte a planta 2D em uma representacao 3D inicial da construcao.
5. O usuario refina a maquete adicionando elementos arquitetonicos e objetos de ambientacao.
6. O usuario posiciona, move e ajusta esses elementos diretamente na cena 3D.
7. O usuario gera um relatorio visual em PDF com vistas principais da maquete.

## Proposta de valor
- Tornar a visualizacao arquitetonica acessivel para pessoas leigas.
- Oferecer uma experiencia guiada e intuitiva para montar uma maquete 3D a partir de uma planta.
- Permitir iteracao visual rapida sem depender de software tecnico complexo.
- Oferecer uma experiencia diferenciada de controle gestual da maquete, tornando a interacao mais intuitiva, visual e memoravel.

## Principios de UX e produto
- A aplicacao deve ser entendivel por pessoas sem repertorio tecnico.
- A experiencia deve privilegiar manipulacao visual direta em vez de formularios complexos.
- O fluxo deve sempre partir de uma representacao 2D e evoluir para a maquete 3D.
- A interface deve priorizar clareza, feedback visual e acoes reversiveis.
- Controles importantes e acoes novas devem viver prioritariamente no header superior.
- O controle por gestos deve ser tratado como diferencial de experiencia, nao como detalhe secundario.
- O usuario deve conseguir entender visualmente o que a camera esta capturando e como isso afeta a maquete.
- O card `Capture` deve existir como retorno visual ativo sempre que a experiencia gestual estiver habilitada.

## Escopo funcional principal

### 1. Entrada da planta 2D
- Upload de imagem da planta.
- Criacao da planta via chat dentro da aplicacao.
- Compatibilidade com plantas geradas externamente.
- Preview da planta importada no editor.

### 2. Conversao 2D para 3D
- Geracao de uma maquete 3D inicial a partir da planta.
- Interpretacao heuristica de paredes, ambientes e volumetria.
- Evolucao futura para portas, janelas, cobertura e detalhamento arquitetonico.

### 3. Biblioteca de elementos 3D
- Adicao incremental de objetos e componentes na maquete.
- Itens iniciais desejados:
- carro
- arvores
- jardim
- telhado
- portas
- janelas
- camas
- mesas
- cadeiras
- sofas
- televisao
- objetos de decoracao e apoio

### 4. Edicao interativa da maquete
- Selecionar um item da biblioteca e inserir na cena.
- Mover o item para a posicao desejada.
- Arrastar o item para dentro da projecao 3D.
- Ajustar rotacao, escala e posicionamento.
- Evoluir para gizmos visuais e snapping simplificado.

### 5. Navegacao e manipulacao
- Orbita, giro e zoom na maquete.
- Controle por mouse, touch e gestos.
- Opcao de bloquear a movimentacao por gestos.
- Feedback visual da captura e das maos detectadas.
- O card `Capture` deve mostrar claramente a leitura visual do tracking, as maos detectadas e o estado atual da interacao.
- A experiencia de controlar a maquete com as maos deve ser simples, clara e prazerosa para o usuario final.

### 6. Saida e documentacao visual
- Geracao de PDF com relatorio visual da maquete.
- O PDF deve incluir no minimo:
- vista frontal
- vista lateral esquerda
- vista lateral direita
- vista dos fundos
- vista diagonal/perspectiva
- imagem da planta 2D de referencia
- resumo visual do projeto

## Funcionalidades candidatas para backlog

### Prioridade alta
- Chat interno para ajudar o usuario a criar ou ajustar a planta 2D.
- Pipeline mais robusto de conversao de planta 2D para massa 3D.
- Insercao real de objetos 3D na cena a partir da Biblioteca 3D.
- Selecao e manipulacao direta dos objetos dentro do viewport.
- Exportacao de PDF com capturas automaticas da maquete.

### Prioridade media
- Presets de portas, janelas, telhados e fachadas.
- Organizacao por categorias de mobilia e area externa.
- Duplicar, remover e substituir objetos na cena.
- Modo de ajuda guiada para usuarios iniciantes.
- Salvamento de projeto e restauracao de sessao.

### Prioridade futura
- Sugestoes automaticas de mobilia por comodo.
- Geracao assistida de fachada.
- Modo de passeio pela casa.
- Exportacao para formatos 3D externos.
- Colaboracao compartilhada ou revisao com terceiros.

## Regras para futuras implementacoes
- Toda nova funcionalidade deve reforcar o fluxo planta 2D -> maquete 3D -> refinamento -> relatorio visual.
- A biblioteca de objetos deve ser pensada para insercao progressiva e manipulacao simples.
- A experiencia nao deve exigir conhecimento tecnico de CAD ou BIM.
- Antes de adicionar complexidade tecnica, deve existir uma versao simples e utilizavel da funcionalidade.
- Toda funcionalidade nova deve informar claramente seu valor para o usuario final.

## Definicoes de sucesso
- Um usuario leigo consegue importar uma planta e visualizar uma maquete 3D inicial.
- O usuario consegue adicionar objetos e entender onde eles foram posicionados.
- O usuario consegue produzir um PDF visualmente util sem depender de software externo.
- A aplicacao transmite sensacao de controle, clareza e evolucao visual do projeto.

## Plano de implementacao

### Premissas obrigatorias
- A interface atual do editor e a base oficial do produto.
- O foco do desenvolvimento e adicionar comportamento, dados e fluxos sem reabrir uma frente paralela de redesign.
- Cada fase deve produzir valor utilizavel dentro da UI atual.
- Sempre que uma funcionalidade nova surgir, deve primeiro ser mapeada para header, viewport, referencia, console ou coluna direita.

### Mapeamento fixo da interface
- Header superior:
- acoes globais, alternancia de modos, importacao, biblioteca, chat, exportacao e ajuda
- Viewport 3D central:
- palco principal de navegacao, selecao, insercao e manipulacao da maquete
- Card Capture:
- retorno visual da camera e do hand tracking
- validacao visual da experiencia de controle da maquete com as maos
- confirmacao para o usuario de quais maos e gestos estao sendo reconhecidos
- Card Referencia:
- espelho da planta 2D usada como base do projeto
- Card Console:
- historico de eventos e etapas executadas pelo usuario ou pelo pipeline
- Coluna direita:
- contexto dinamico, alternando entre sinais, inspector, biblioteca, propriedades do objeto selecionado e exportacao

### Pilar tecnico 1. Modelo de dados
- Devemos manter entidades explicitas para evitar acoplamento entre UI e logica.
- Entidades obrigatorias:
- projeto
- planta 2D
- modelo 3D base
- asset de biblioteca
- instancia de asset na cena
- selecao ativa
- exportacao de relatorio

### Pilar tecnico 2. Estado do editor
- O editor precisa de uma camada unica de estado para sincronizar:
- planta importada
- maquete convertida
- objetos inseridos
- item selecionado
- historico de logs
- estado do viewer
- estado da exportacao

### Pilar tecnico 3. Evolucao incremental da interface
- O header recebe comandos.
- O viewport executa a interacao principal.
- O console narra o que aconteceu.
- O inspector mostra o contexto atual.
- A biblioteca alterna na coluna direita sem quebrar o fluxo.
- O card `Capture` confirma em tempo real a relacao entre gesto detectado e resposta da maquete.

## Diretriz de experiencia gestual
- A experiencia de controlar a maquete com as maos e parte central do produto.
- O `Capture` nao deve ser tratado apenas como monitor tecnico da webcam.
- O `Capture` deve funcionar como espelho da interacao do usuario com a maquete.
- Sempre que os gestos estiverem habilitados, o usuario deve conseguir:
- ver a propria mao capturada
- entender se o gesto foi reconhecido
- perceber se a maquete esta respondendo ao gesto
- saber quando os gestos estao bloqueados ou liberados
- Quando os gestos estiverem bloqueados, o `Capture` continua como feedback visual, mas sem acionar movimento na maquete.
- Melhorias futuras nessa area devem priorizar:
- menor latencia percebida
- feedback visual mais claro de gesto valido
- maior legibilidade do estado ativo da interacao
- onboarding simples para ensinar orbita, giro e zoom por maos

## Fases detalhadas

### Fase 0. Fundacao tecnica e contratos
- Objetivo:
- preparar a base para as proximas fases sem alterar a experiencia visual principal
- O que implementar:
- definir tipos e contratos para projeto, cena, asset, selecao e relatorio
- padronizar logs do console como eventos reais de sistema
- organizar o estado central do editor
- separar melhor responsabilidades entre upload, conversao, viewer e biblioteca
- Etapas:
- mapear estruturas de dados atuais e lacunas
- criar tipos unificados
- criar funcoes auxiliares para emitir logs
- centralizar o estado do editor
- Resultado esperado:
- a base do projeto fica previsivel e pronta para crescer
- Criterio de pronto:
- novos fluxos conseguem usar o mesmo estado sem duplicacao improvisada

### Fase 1. Shell do editor estabilizado
- Objetivo:
- consolidar a UI atual como shell definitivo do produto
- O que implementar:
- revisar estados de loading, empty state, error state e fallback visual
- garantir consistencia entre cards, overlays, paines contextuais e header
- eliminar pontos de quebra do viewer e de troca de paineis
- Etapas:
- auditar interacoes do header
- revisar comportamento da coluna direita quando alterna contexto
- revisar resize, fullscreen e responsividade do viewport
- revisar console, referencia e capture como componentes estaveis
- Resultado esperado:
- o editor deixa de ser prototipo visual e vira base operacional
- Criterio de pronto:
- a interface suporta as fases seguintes sem nova reestruturacao visual

### Fase 2. Entrada e preparacao da planta 2D
- Objetivo:
- tornar a etapa de entrada da planta clara, confiavel e guiada
- O que implementar:
- fluxo robusto de upload
- validacoes de formato e proporcao
- preview consistente no card de referencia
- logs de pipeline de entrada no console
- Etapas:
- definir regras minimas de arquivos aceitos
- melhorar mensagens de erro e sucesso
- padronizar como a planta fica armazenada no projeto
- preparar suporte futuro para criacao via chat
- Resultado esperado:
- o usuario entende claramente que importou a planta e qual projeto esta ativo
- Criterio de pronto:
- qualquer planta valida entra no sistema com preview e metadados consistentes

### Fase 3. Conversao de planta 2D em maquete 3D base
- Objetivo:
- melhorar a transicao entre planta e massa 3D inicial
- O que implementar:
- pipeline de conversao mais estruturado
- modelo intermediario entre imagem e cena 3D
- heuristicas melhores para paredes, limites e setores principais
- Etapas:
- definir estrutura intermediaria da planta interpretada
- separar parsing da imagem de geracao da cena
- enriquecer o console com passos do processamento
- calibrar a escala e o enquadramento inicial da maquete
- Resultado esperado:
- a maquete inicial passa a representar melhor a planta carregada
- Criterio de pronto:
- o usuario importa uma planta e recebe uma cena inicial legivel e navegavel

### Fase 4. Biblioteca 3D operacional
- Objetivo:
- transformar a Biblioteca 3D em uma fonte real de objetos para a cena
- O que implementar:
- catalogo estruturado de assets
- insercao real de itens no scene graph
- instancia de objetos na maquete com id e propriedades proprias
- Etapas:
- definir estrutura de asset versus instancia
- implementar acao de adicionar asset na cena
- registrar insercao no console
- refletir selecao do item no inspector
- Resultado esperado:
- a biblioteca deixa de ser apenas curadoria visual e vira ferramenta de composicao
- Criterio de pronto:
- ao clicar em adicionar, o objeto aparece na maquete e fica identificavel no estado do projeto

### Fase 5. Selecao e manipulacao de objetos
- Objetivo:
- permitir que qualquer pessoa posicione objetos com facilidade
- O que implementar:
- picking de objetos no viewport
- selecao visual do item ativo
- mover, rotacionar e escalar de forma simplificada
- Etapas:
- implementar raycast e selecao
- destacar visualmente objeto selecionado
- criar controles simples de transformacao
- permitir arraste dentro do plano da maquete
- adicionar snapping basico e limites simples
- Resultado esperado:
- o usuario posiciona objetos sem entender conceitos tecnicos de modelagem
- Criterio de pronto:
- o fluxo selecionar -> mover -> ajustar funciona no viewport com feedback claro

### Fase 6. Elementos arquitetonicos e presets de construcao
- Objetivo:
- sair da massa 3D generica e aproximar a cena de uma casa real
- O que implementar:
- presets de telhado
- presets de janelas
- presets de portas
- elementos externos como jardim e arvores
- Etapas:
- priorizar componentes mais visiveis na leitura da casa
- criar presets simples antes de versoes parametrizadas
- expor selecao e configuracao pelo inspector
- adicionar categorias especificas na biblioteca
- Resultado esperado:
- a maquete ganha identidade arquitetonica e nao apenas decoracao
- Criterio de pronto:
- o usuario consegue personalizar fachada, aberturas e cobertura de forma simples

### Fase 7. Mobiliario e ambientacao
- Objetivo:
- permitir que o usuario transforme a maquete em uma representacao habitavel
- O que implementar:
- cama, mesa, cadeira, sofa, televisao, carro e itens de apoio
- organizacao por categorias e subcategorias
- comportamento coerente por tipo de item
- Etapas:
- definir conjunto minimo de assets prioritarios
- validar escala e posicionamento padrao por categoria
- permitir duplicar e remover instancias
- registrar alteracoes no console
- Resultado esperado:
- a maquete comunica uso e composicao dos ambientes
- Criterio de pronto:
- o usuario consegue mobiliar a casa sem precisar de orientacao tecnica avancada

### Fase 8. Chat guiado dentro da aplicacao
- Objetivo:
- reduzir a dependencia de conhecimento tecnico e conduzir o usuario
- O que implementar:
- entrada de chat integrada ao header
- capacidade de orientar criacao da planta
- capacidade de sugerir proximo passo na maquete
- capacidade de acionar operacoes do editor futuramente
- Etapas:
- definir area de abertura do chat sem quebrar o editor
- conectar o chat ao estado do projeto
- definir mensagens utilitarias para usuarios iniciantes
- preparar comandos assistidos como importar, adicionar ou exportar
- Resultado esperado:
- a aplicacao passa a ensinar o uso enquanto o usuario constroi sua maquete
- Criterio de pronto:
- o chat consegue orientar entrada, composicao e saida do projeto de forma contextual

### Fase 9. Exportacao de relatorio visual em PDF
- Objetivo:
- fechar o fluxo com uma saida compartilhavel e facil de entender
- O que implementar:
- captura automatica de vistas
- montagem visual do relatorio
- exportacao de PDF a partir do projeto atual
- Etapas:
- definir angulos padrao de captura
- gerar imagens de frente, laterais, fundos e diagonal
- incluir a planta 2D de referencia
- montar template visual do PDF
- expor exportacao no header
- Resultado esperado:
- o usuario sai da aplicacao com um artefato visual util para apresentar o projeto
- Criterio de pronto:
- um clique gera PDF com vistas corretas e composicao coerente

## Dependencias entre fases
- Fase 0 e prerequisito para todas as outras.
- Fase 1 precisa vir antes de qualquer feature grande que dependa de estabilidade do shell.
- Fase 3 depende de Fase 2 porque a maquete nasce da interpretacao da planta.
- Fase 5 depende de Fase 4 porque nao faz sentido manipular objetos antes de inseri-los.
- Fase 6 e Fase 7 podem evoluir em paralelo depois que Fase 5 estiver funcional.
- Fase 8 deve usar o estado consolidado das fases anteriores.
- Fase 9 depende da maquete final estar renderizavel e navegavel com consistencia.

## Ordem tecnica recomendada
1. Fase 0. Fundacao tecnica e contratos.
2. Fase 1. Shell do editor estabilizado.
3. Fase 2. Entrada e preparacao da planta 2D.
4. Fase 3. Conversao de planta 2D em maquete 3D base.
5. Fase 4. Biblioteca 3D operacional.
6. Fase 5. Selecao e manipulacao de objetos.
7. Fase 6. Elementos arquitetonicos e presets de construcao.
8. Fase 7. Mobiliario e ambientacao.
9. Fase 8. Chat guiado dentro da aplicacao.
10. Fase 9. Exportacao de relatorio visual em PDF.

## Regras de preservacao da interface
- O header continua sendo a regiao principal para comandos e entradas novas.
- O viewport 3D continua sendo o foco visual principal.
- O card de referencia continua sendo o espelho da planta 2D importada.
- O console continua sendo historico operacional simples, nunca um painel poluido de metricas sem contexto.
- A coluna direita continua sendo contexto dinamico, alternando entre sinais, biblioteca, inspector e propriedades.
- Toda funcionalidade nova deve primeiro buscar encaixe na interface atual antes de propor novo layout.

## Backlog tecnico refinado
- Definir store central do editor
- Definir scene graph para instancias de objetos
- Definir mecanismo de picking no viewer
- Definir mecanismo de transformacao de objetos
- Definir pipeline de capturas para PDF
- Definir template de relatorio em PDF
- Definir integracao do chat com estado do projeto
- Definir persistencia futura de projeto

## Definicao de pronto por marco
- Marco 1:
- o editor esta estavel e tem estado consistente
- Marco 2:
- a planta entra com preview e gera maquete base confiavel
- Marco 3:
- a biblioteca insere objetos reais e o usuario consegue posiciona-los
- Marco 4:
- a casa ganha elementos arquitetonicos e ambientacao
- Marco 5:
- o chat ajuda o usuario a completar o fluxo
- Marco 6:
- o projeto gera PDF visual pronto para compartilhamento
