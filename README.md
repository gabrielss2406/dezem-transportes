# Dezem — Sistema de Gestão de Frota

App desktop (Electron + Vite + React + TypeScript + SQLite) para gestão de frota da Dezem Transportes.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Desktop | Electron 29 |
| Build | electron-vite + Vite 5 |
| Frontend | React 18 + TypeScript |
| Estilo | Tailwind CSS 3 |
| Banco de dados | SQLite (better-sqlite3) |
| Auth | bcryptjs (senha local) |
| Build Windows | electron-builder (NSIS) |

## Estrutura

```
src/
  main/
    index.ts       — Processo principal Electron
    database.ts    — Setup SQLite + todas as tabelas
    handlers.ts    — Todos os handlers IPC
  preload/
    index.ts       — contextBridge — expõe window.api
  renderer/
    src/
      App.tsx             — Router + auth
      components/
        Sidebar.tsx       — Navegação lateral
        ui.tsx            — Design system (Button, Input, Table, Modal...)
      pages/
        Login.tsx         — Tela de login
        Dashboard.tsx     — KPIs e resumo financeiro
        Viagens.tsx       — Registro e listagem de viagens
        Custos.tsx        — Lançamento de custos + salários automáticos
        Cadastros.tsx     — Caminhões, Motoristas, Clientes, Produtos, Fornecedores
      hooks/
        useIpc.ts         — Hook helper para chamadas IPC
      lib/
        types.ts          — Tipos TypeScript + declaração window.api
        utils.ts          — Formatação, constantes
```

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em desenvolvimento
npm run dev

# 3. Build do instalador Windows
npm run dist
```

## Acesso padrão

- **Senha:** `dezem2024`
- Troque a senha em Configurações após o primeiro login.

## Banco de dados

O arquivo `dezem.db` fica salvo em:
- **Windows:** `%APPDATA%\dezem-gestao-frota\dezem.db`
- **macOS:** `~/Library/Application Support/dezem-gestao-frota/dezem.db`

## Backup

O backup manual pode ser feito copiando o arquivo `dezem.db` para outro local. A funcionalidade de backup automático no Google Drive está prevista para a Semana 6 do roadmap.

## Semanas do Roadmap

| Semana | Entrega | Status |
|--------|---------|--------|
| 1 | Setup & Estrutura Base | ✅ Este ZIP |
| 2 | Auth + Cadastros Simples | ✅ Incluso |
| 3 | Viagens & Quilometragem | ✅ Incluso |
| 4 | Custos | ✅ Incluso |
| 5 | Dashboard & Relatórios | ✅ Dashboard incluso |
| 6 | Nota Fiscal & Backup Google Drive | 🔲 A implementar |
| 7–8 | Instalador, Testes & Entrega | 🔲 A implementar |
