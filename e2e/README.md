# Testes E2E com Selenium

Estes testes abrem o navegador de verdade e validam o fluxo integrado entre:

- frontend React/Vite;
- backend Django;
- banco local de desenvolvimento.

## Instalar dependências

Na raiz do projeto:

```bash
pip install -r requirements-dev.txt
```

## Subir o backend

Em um terminal:

```bash
cd src
python manage.py migrate
python manage.py runserver
```

Backend esperado:

```txt
http://127.0.0.1:8000
```

## Subir o frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

Frontend esperado:

```txt
http://127.0.0.1:5173
```

## Rodar o E2E

Na raiz do projeto:

```bash
python -m unittest e2e.test_president_family_registration
```

## Rodar vendo o navegador

Por padrão, o teste roda em modo headless. Para ver o Chrome abrindo:

```bash
SELENIUM_HEADLESS=0 python -m unittest e2e.test_president_family_registration
```

## O que o teste valida

- abre o PILAR no navegador;
- entra como Presidente de Rua;
- acessa cadastro de família;
- preenche o formulário;
- salva a família;
- valida que a família aparece na fila/lista;
- valida que a família foi persistida no banco local.

## Pré-requisitos

- Google Chrome instalado;
- backend rodando em `127.0.0.1:8000`;
- frontend rodando em `127.0.0.1:5173`;
- banco local migrado.
