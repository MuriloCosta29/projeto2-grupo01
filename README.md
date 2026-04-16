# Histórias de Usuário

---

## Persona: Presidente de Rua

### Cenário 1 - Cadastro de família em área sem CEP oficial
**Dado** que o Presidente de Rua acessa o formulário de nova família,  
**Quando** ele preenche os dados usando apenas o "Código da Viela" e deixa o campo CEP em branco,  
**Então** o sistema deve validar o cadastro normalmente,  
**E** deve exibir uma mensagem de "Família mapeada com sucesso".

### Cenário 2 - Prevenção de cadastro duplicado
**Dado** que o Presidente de Rua preenche o formulário com dados muito similares a alguém já existente (ex: mesmo nome e viela),  
**Quando** ele finaliza o cadastro clicando em salvar,  
**Então** o sistema deve interromper a ação automaticamente,  
**E** deve exibir um alerta informando "Atenção: Possível duplicidade de morador encontrada".

### Cenário 3 - Consulta de histórico de entregas
**Dado** que o Presidente de Rua acessa o perfil de uma família cadastrada,  
**Quando** ele clica na aba de histórico,  
**Então** o sistema deve exibir a lista completa de datas em que a família recebeu cestas,  
**E** o Presidente de Rua poderá avaliar se a doação é justa.

### Cenário 4 - Ordenação da fila de prioridades por urgência
**Dado** que o Presidente de Rua acessa a tela de fila de prioridade,  
**Quando** o sistema carrega a lista de famílias cadastradas naquela região,  
**Então** a lista deve ser ordenada automaticamente pelo sistema,  
**E** as famílias com maior número de dias sem receber devem aparecer no topo da tela.

### Cenário 5 - Registro rápido de entrega de cesta básica
**Dado** que o Presidente de Rua está visualizando a fila de prioridades,  
**Quando** ele clica no botão "Confirmar Entrega" ao lado do nome do morador,  
**Então** o sistema deve atualizar a data de recebimento da família para o dia atual no banco de dados,  
**E** o morador deve sumir da lista de urgências.

### Cenário 6 - Salvamento de dados sem conexão de internet (Modo Offline)
**Dado** que o Presidente de Rua perdeu o sinal de internet (4G) durante a rota,  
**Quando** ele realiza e salva o cadastro de uma família no aplicativo,  
**Então** o sistema deve armazenar os dados temporariamente no cache do celular,  
**E** deve exibir uma mensagem informando que "Os dados serão sincronizados quando a internet voltar".

### Cenário 7 - Acesso rápido ao suporte operacional
**Dado** que o Presidente de Rua está com uma dúvida urgente durante a entrega,  
**Quando** ele clica no botão de "Ajuda" no aplicativo,  
**Então** o sistema deve redirecioná-lo automaticamente para o WhatsApp,  
**E** deve abrir uma conversa direta com o número oficial de suporte do G10 Favelas.

### Cenário 12 - Filtragem operacional do status de recebimento na rua
**Dado** que o Presidente de Rua possui uma lista extensa de famílias no aplicativo,  
**Quando** ele seleciona o filtro "Já Receberam",  
**Então** o sistema deve ocultar as famílias que ainda precisam de cesta,  
**E** deve exibir apenas os moradores que já retiraram a doação naquela semana.

---

## Persona: Administrador (Governança)

### Cenário 8 - Visualização do impacto de distribuição
**Dado** que o Administrador acessa o painel de controle do sistema,  
**Quando** a página principal (Dashboard) é carregada,  
**Então** o sistema deve calcular automaticamente as doações do banco de dados,  
**E** deve exibir o número total de cestas distribuídas naquele mês.

### Cenário 9 - Monitoramento dos agentes em campo
**Dado** que o Administrador acessa a aba de "Agentes",  
**Quando** ele seleciona o perfil de um Presidente de Rua,  
**Então** o sistema deve exibir a região de cobertura desse agente,  
**E** a quantidade de entregas que ele realizou no período.

### Cenário 13 - Filtragem gerencial de entregas por região
**Dado** que o Administrador está no painel de controle,  
**Quando** ele seleciona uma comunidade específica no filtro de regiões,  
**Então** o sistema deve recalcular os dados exibidos,  
**E** deve mostrar apenas o histórico e o volume de cestas entregues naquela localidade escolhida.

---

## Persona: Morador (Transparência)

### Cenário 10 - Notificação automática de disponibilidade de cesta
**Dado** que o sistema identificou que chegou o dia da entrega na região da família,  
**Quando** o Presidente de Rua ou Administrador libera o lote de cestas no sistema,  
**Então** o sistema deve disparar um aviso automático (via SMS/WhatsApp) para o morador,  
**E** deve informar a data, horário e o local exato da retirada.

### Cenário 11 - Registro de denúncia anônima na ouvidoria
**Dado** que o morador acessa o link de denúncias do sistema sem realizar login,  
**Quando** ele preenche a reclamação e clica em enviar,  
**Então** o sistema deve salvar a denúncia no banco de dados sem atrelar nenhum IP ou nome,  
**E** deve exibir a mensagem "Denúncia enviada com sucesso e total sigilo".
