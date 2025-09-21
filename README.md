# Lista de Tarefas (To‑Do)

Aplicativo web simples em HTML/CSS/JavaScript vanilla com persistência em `localStorage`.

## Como executar

- Abra `index.html` no navegador (Chrome/Edge/Firefox).
- Adicione tarefas, marque como concluídas, edite e remova.
- As tarefas ficam salvas localmente no navegador.

## Funcionalidades

- Criar, listar, editar e remover tarefas (CRUD)
- Marcar como concluída/ativa
- Filtros: Todas, Ativas, Concluídas
- Limpar concluídas
- Contadores: restantes e total
- Acessibilidade básica (rótulos, estados, foco)

## Estrutura

- `index.html` — layout e elementos base
- `style.css` — estilos (tema escuro)
- `app.js` — lógica de CRUD + `localStorage`

## Versão em React (sem build)

- Abra `react.html` no navegador para usar a versão em React (hooks + componentes).
- Arquivos:
  - `react.html` — shell com React UMD + Babel (JSX no navegador)
  - `react-app.jsx` — componentes React e lógica
  - Reaproveita `style.css` para estilos

Observação: `react.html` carrega React/Babel via CDN.

## Versão com build (Vite + React)

Projeto separado em `todo-react-vite` usando Vite + React com hot reload.

Como executar:

1) Requisitos: Node.js 18+ e npm.
2) No terminal:

```
cd todo-react-vite
npm install
npm run dev
```

3) Abra a URL indicada (ex.: `http://localhost:5173`).

Build de produção:

```
npm run build
npm run preview
```

## Deploy (rápido)

- GitHub Pages: publique os arquivos da raiz (`index.html`, `style.css`, `app.js`) ou use a versão React (`react.html` + `react-app.jsx`). Ative o Pages para a branch principal (pasta raiz).
- Netlify/Vercel: arraste e solte a pasta do projeto; não é necessário build para a versão estática.
- Vite/React: dentro de `todo-react-vite`, rode `npm run build` e publique o conteúdo de `todo-react-vite/dist`.

