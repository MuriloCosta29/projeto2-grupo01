# Testes E2E com Selenium

Estes testes abrem o navegador de verdade e validam o fluxo integrado entre:

- frontend React/Vite;
- backend Django;
- banco local de desenvolvimento.

## Estrutura

```txt
e2e/
├── support.py                          # infraestrutura compartilhada (driver, helpers, limpeza)
├── run_suite.py                        # runner que roda os 3 fluxos numa ordem fixa
├── test_president_family_registration.py  # fluxo Presidente de Rua
├── test_resident_flow.py               # fluxo Morador (consulta + ouvidoria)
└── test_admin_flow.py                  # fluxo Administrador / Coordenação
```

`support.py` concentra a leitura das variáveis de ambiente, a checagem de que os
serviços estão no ar, a criação do WebDriver e a classe base `PilarE2ETestCase`
com os helpers de interação e a limpeza de dados. Cada arquivo de fluxo importa
essa base e foca apenas na história de negócio que valida.

Cada teste cria seus dados com um `suffix` único e os remove no `tearDown`,
então a ordem de execução não importa e nada de desenvolvimento real é tocado.

## Dependências

- Python com o projeto Django importável (usamos a venv em `src/.venv`);
- `selenium>=4.34,<5` (já em `requirements-dev.txt`);
- Google Chrome instalado. O Selenium 4 resolve o ChromeDriver sozinho via
  Selenium Manager — não é preciso instalar o driver manualmente.

Instale as dependências de desenvolvimento na raiz do projeto:

```bash
src/.venv/bin/python -m pip install -r requirements-dev.txt
```

## Subir o backend

Em um terminal:

```bash
cd src
../src/.venv/bin/python manage.py migrate
../src/.venv/bin/python manage.py runserver
```

Backend esperado em `http://127.0.0.1:8000`.

## Subir o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend esperado em `http://localhost:5173`.

## Rodar os testes

Sempre use o Python da venv (`src/.venv/bin/python`) para que o `import django`
funcione.

Rodar a suíte completa em ordem de negócio (**Administrador → Presidente de Rua
→ Morador**), com relatório único:

```bash
src/.venv/bin/python -m e2e.run_suite
```

Rodar a suíte completa pela descoberta padrão do unittest (ordem alfabética dos
arquivos):

```bash
src/.venv/bin/python -m unittest discover -s e2e -p "test_*.py"
```

Rodar um fluxo específico:

```bash
src/.venv/bin/python -m unittest e2e.test_president_family_registration
src/.venv/bin/python -m unittest e2e.test_resident_flow
src/.venv/bin/python -m unittest e2e.test_admin_flow
```

Localmente, esses comandos abrem o Chrome visível e executam os passos na tela.

## Headless (CI)

Para rodar invisível:

```bash
SELENIUM_HEADLESS=1 src/.venv/bin/python -m unittest discover -s e2e -p "test_*.py"
```

Se a variável `CI` estiver definida, o modo headless já é o padrão.

## Screencast / demonstração

Os delays existem **apenas** para gravação; em headless ficam zerados e não
mascaram instabilidade. Para uma demonstração lenta e com o Chrome aberto no fim:

```bash
SELENIUM_STEP_DELAY=2 \
SELENIUM_TYPING_DELAY=0.15 \
SELENIUM_KEEP_BROWSER_OPEN=1 \
src/.venv/bin/python -m unittest e2e.test_president_family_registration
```

## Variáveis de ambiente

| Variável                    | Padrão                      | Para quê                                            |
| --------------------------- | --------------------------- | --------------------------------------------------- |
| `E2E_FRONTEND_URL`          | `http://localhost:5173`     | URL do frontend                                     |
| `E2E_BACKEND_URL`           | `http://127.0.0.1:8000`     | URL do backend                                      |
| `SELENIUM_HEADLESS`         | `1` em CI, senão `0`        | Roda o Chrome invisível                             |
| `SELENIUM_TIMEOUT`          | `15`                        | Tempo máximo (s) das esperas explícitas             |
| `SELENIUM_STEP_DELAY`       | `0.8` visível / `0` headless| Pausa entre passos (só screencast)                  |
| `SELENIUM_TYPING_DELAY`     | `0.08` visível / `0` headless| Digitação caractere a caractere (só screencast)    |
| `SELENIUM_KEEP_BROWSER_OPEN`| `0`                         | Mantém o Chrome aberto no fim                        |

## Diagnosticar erro de porta

O Vite sobe na `5173` por padrão, mas usa a próxima porta livre se ela estiver
ocupada (5174, 5175...). Se os testes falharem com "Serviço indisponível":

1. Confirme em qual porta o Vite subiu (ele imprime a URL no terminal).
2. Aponte os testes para ela:

   ```bash
   E2E_FRONTEND_URL=http://localhost:5174 \
   src/.venv/bin/python -m unittest discover -s e2e -p "test_*.py"
   ```

3. Para descobrir quem ocupa a porta:

   ```bash
   lsof -i :5173   # frontend
   lsof -i :8000   # backend
   ```

4. Mesmo raciocínio vale para o backend via `E2E_BACKEND_URL`.

## O que os testes validam

### Presidente de Rua (`test_president_family_registration.py`)

- cadastra uma família pela interface e valida que ela entra na fila e no banco;
- registra a entrega de uma cesta pela lista de famílias e valida o `DeliveryLog`;
- com a rede simulada como offline, salva o cadastro localmente e confirma que
  **não** vai ao banco antes da sincronização.

### Morador (`test_resident_flow.py`)

- localiza o cadastro por nome + código da viela e vê o histórico de entregas;
- registra uma denúncia anônima na ouvidoria, valida o protocolo na tela e o
  registro persistido.

### Administrador (`test_admin_flow.py`)

- login de staff, cadastro de região e cadastro de Presidente de Rua;
- dashboard de entregas por região refletindo uma entrega real;
- processamento de avisos de disponibilidade de cesta por região, com validação
  do aviso "pronto para WhatsApp" no banco.

## Seletores

A estratégia, em ordem de preferência:

1. `data-testid` para elementos sem texto estável ou cujo CSS é só estilo
   (botões de perfil na home, seções do admin, confirmar entrega, processar
   avisos, enviar denúncia);
2. atributo `name` para campos de formulário;
3. texto visível (`click_button_containing`) como fallback legível.

Evitamos XPath acoplado a classe de CSS — daí os `data-testid` adicionados nas
seções de administração, que antes eram selecionadas por `class`.

## Notas de estabilidade

- **Autenticação de admin.** O endpoint de login é rate-limited (10 req/10min
  por IP). Por isso só **um** teste faz login pela interface; os demais testes
  de admin semeiam a sessão injetando um token válido no `localStorage`
  (`seed_admin_session` em `support.py`). Isso mantém a suíte repetível em loop
  e em CI, e ainda preserva a cobertura real da tela de login.
- **Fluxo offline.** A validação "nada foi persistido" roda enquanto a rede
  ainda está desligada, de propósito: ao religar a rede o app sincroniza
  automaticamente, então checar depois seria uma corrida.

## Cobertura ainda não automatizada

- **Sincronização offline → online completa.** Validamos o salvamento offline;
  o round-trip de voltar a ter rede e sincronizar com o backend envolve
  `localStorage` + reconexão e é frágil de automatizar de forma estável. Hoje
  está coberto por testes unitários do frontend.
- **Edição/desativação de Presidente de Rua** pela interface admin.
- **Filtros operacionais** da lista (status de recebimento, faixas de espera)
  além do uso indireto da busca.
- **Monitoramento de agentes em campo** no painel administrativo.

## Pré-requisitos

- Google Chrome instalado;
- backend rodando em `127.0.0.1:8000`;
- frontend rodando em `127.0.0.1:5173`;
- banco local migrado.
