# Especificação Funcional e Cenários de BDD - Projeto Presidente de Rua

Este documento detalha as regras de negócio e os cenários de validação para o sistema de logística inteligente do G10 Favelas, estruturado por personas e funcionalidades principais.

---

## 1. Mapeamento e Registro de Famílias (Persona: Presidente de Rua)

O Presidente de Rua deve realizar o cadastramento das famílias em sua área de atuação, garantindo a coleta de dados mesmo em locais sem endereçamento oficial (CEP). O sistema deve permitir a identificação por pontos de referência e validar a unicidade dos registros para evitar duplicidade de benefícios.

### Cenários de Validação (BDD):

**Cenário 1 - Registro bem-sucedido de família:**
**Dado** que o Presidente de Rua preenche o "Nome do Responsável", o "Número de Moradores" e o "Código da Viela/Referência",
**Quando** clica no botão "Salvar Cadastro",
**Então** o sistema deve persistir as informações no banco de dados SQLite e exibir confirmação de sucesso.

**Cenário 2 - Falha por campos obrigatórios ausentes:**
**Dado** que o usuário deixa de preencher um ou mais campos obrigatórios no formulário,
**Quando** tenta salvar o registro,
**Então** o sistema deve emitir um alerta informando que "todos os campos são obrigatórios" e impedir a gravação.

**Cenário 3 - Validação de possível duplicidade:**
**Dado** que o usuário insere um nome e localização idênticos a um registro já existente,
**Quando** aciona a gravação,
**Então** o sistema deve disparar um aviso de "Atenção: Possível morador duplicado encontrado" e solicitar confirmação manual.

*Estes cenários garantem a integridade da base de dados e o mapeamento fiel do território.*

---

## 2. Gestão de Prioridades e Entregas (Persona: Presidente de Rua)

A operação logística baseia-se em um algoritmo de triagem que ordena as famílias pela necessidade cronológica. O Presidente de Rua utiliza esta interface para otimizar a distribuição física das cestas básicas e registrar as conclusões de entrega em tempo real.

### Cenários de Validação (BDD):

**Cenário 1 - Ordenação automática da fila de urgência:**
**Dado** que existem famílias cadastradas com diferentes datas de último recebimento,
**Quando** a tela de Fila de Prioridade é acessada,
**Então** o sistema deve listar no topo as famílias com maior intervalo de tempo sem auxílio.

**Cenário 2 - Registro de entrega em lote (Filtragem):**
**Dado** que o Presidente de Rua está realizando entregas em campo,
**Quando** ele aplica o filtro "Já Receberam",
**Então** o sistema deve ocultar temporariamente os nomes pendentes, facilitando a visualização do progresso da rota.

**Cenário 3 - Confirmação de recebimento (Trigger):**
**Dado** que o morador recebeu a cesta física,
**Quando** o Presidente de Rua aciona "Confirmar Entrega",
**Então** o sistema deve atualizar instantaneamente o campo de data no banco de dados e remover o morador da fila de urgência.

*Estes cenários asseguram que a distribuição seja justa e o fluxo de trabalho do agente seja ágil.*

---

## 3. Resiliência Offline e Suporte (Persona: Presidente de Rua)

Devido à instabilidade de conexão em certas áreas da favela, o sistema deve operar sob a filosofia "Offline-First". Além disso, deve prover canal direto para resolução de problemas operacionais críticos.

### Cenários de Validação (BDD):

**Cenário 1 - Persistência de dados em cache local (PWA):**
**Dado** que o dispositivo está sem conectividade com a internet,
**Quando** o Presidente de Rua salva um novo cadastro,
**Então** o sistema deve armazenar a informação no LocalStorage/IndexedDB e informar que a sincronização ocorrerá após o restabelecimento da rede.

**Cenário 2 - Acionamento de suporte via WhatsApp:**
**Dado** que o usuário encontra uma dificuldade técnica ou conflito na rua,
**Quando** clica no ícone de "Ajuda/Suporte",
**Então** o sistema deve redirecioná-lo para uma conversa pré-configurada com a central de atendimento do G10 Favelas.

*Estes cenários garantem que o trabalho não seja interrompido por falhas tecnológicas externas.*

---

## 4. Governança e Dashboard (Persona: Administrador)

O administrador possui uma visão macro da operação, sendo responsável pela prestação de contas e gestão da equipe de Presidentes de Rua. O sistema deve consolidar dados para gerar métricas de impacto social.

### Cenários de Validação (BDD):

**Cenário 1 - Monitoramento de impacto global:**
**Dado** que o Administrador acessa o Painel Principal,
**Quando** os dados são carregados,
**Então** o sistema deve exibir a contagem totalizada de cestas entregues em todas as regiões no período vigente.

**Cenário 2 - Auditoria de performance de agentes:**
**Dado** que o Administrador consulta a lista de usuários do sistema,
**Quando** seleciona um Presidente de Rua específico,
**Então** deve visualizar a contagem de famílias atendidas e a frequência de entregas realizadas por aquele agente.

*Estes cenários garantem transparência e controle administrativo sobre a logística humanitária.*

---

## 5. Transparência e Comunicação (Persona: Morador)

O morador é a ponta final do sistema e deve ter acesso a informações claras sobre seus direitos e canais para manifestação anônima, garantindo a ética em todo o processo.

### Cenários de Validação (BDD):

**Cenário 1 - Recebimento de aviso de disponibilidade:**
**Dado** que uma cesta básica está disponível para retirada na localização do morador,
**Quando** o lote é liberado no sistema,
**Então** o morador deve receber uma notificação automática (SMS/WhatsApp) com as instruções de local e horário.

**Cenário 2 - Registro de denúncia sigilosa:**
**Dado** que um morador identifica irregularidades no processo de entrega,
**Quando** submete o formulário de Ouvidoria,
**Então** o sistema deve registrar o relato de forma anônima, garantindo a proteção da identidade do denunciante.

*Estes cenários promovem a confiança e a segurança da comunidade no sistema de distribuição.*
