# Dezem — Sistema de Gestão de Frota

Sistema desktop robusto para gestão de transportadoras, integrando controle de viagens, custos fixos e variáveis, folha de pagamento de motoristas e dashboards financeiros.

## 🚀 Tecnologias

- **Desktop:** [Electron 29](https://www.electronjs.org/)
- **Build Tool:** [electron-vite](https://electron-vite.org/)
- **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Banco de Dados:** [SQLite](https://sqlite.org/) (via `better-sqlite3`)
- **Gráficos:** [Recharts](https://recharts.org/)

## 📋 Pré-requisitos

Antes de começar, você precisará ter instalado em sua máquina:
- **Node.js:** v20.19.0 (recomendado)
- **Git**

## 🛠️ Instalação e Execução

### 1. Instalação das Dependências
No terminal do projeto, execute:
```bash
npm install
```

### 2. Ambiente de Desenvolvimento
Para rodar o aplicativo em modo de desenvolvimento com Hot Reload:
```bash
npm run dev
```

### 3. Gerar Instalador (Build de Produção)
Para criar o instalador `.exe` (Windows) do sistema:
```bash
npm run dist
```
*O instalador será gerado na pasta `release/`.*

---

## 📂 Localização do Banco de Dados

O banco de dados SQLite (`dezem.db`) é criado automaticamente na primeira execução no diretório de dados do usuário:

- **Windows:** `%APPDATA%\dezem-gestao-frota\dezem.db`
- **Linux:** `~/.config/dezem-gestao-frota/dezem.db`
- **macOS:** `~/Library/Application Support/dezem-gestao-frota/dezem.db`

---

## 🔐 Acesso Padrão

- **Usuário:** Admin
- **Senha Inicial:** `dezem2024`
*(Recomenda-se a alteração da senha no primeiro acesso).*

---

## ❓ Solução de Problemas Comuns

### Erro `EBUSY: resource busy or locked` durante o build
Este erro ocorre se você tentar rodar `npm run dist` enquanto o aplicativo ou o servidor de desenvolvimento ainda estiverem abertos.
**Solução:**
1. Feche todas as janelas do aplicativo.
2. No terminal, encerre o processo com `Ctrl + C`.
3. Verifique no Gerenciador de Tarefas se não há processos "Electron" travados e finalize-os.

### Recompilação de módulos nativos (SQLite)
Se encontrar erros relacionados ao `better-sqlite3`, as dependências nativas podem precisar de recompilação para sua versão do Electron:
```bash
npx electron-builder install-app-deps
```

---
