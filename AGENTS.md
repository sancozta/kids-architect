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

## Principios de UX e produto
- A aplicacao deve ser entendivel por pessoas sem repertorio tecnico.
- A experiencia deve privilegiar manipulacao visual direta em vez de formularios complexos.
- O fluxo deve sempre partir de uma representacao 2D e evoluir para a maquete 3D.
- A interface deve priorizar clareza, feedback visual e acoes reversiveis.
- Controles importantes e acoes novas devem viver prioritariamente no header superior.

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
