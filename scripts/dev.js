// VS Code sets ELECTRON_RUN_AS_NODE=1 in its terminal environment, which prevents
// Electron from initializing its APIs. Clear it before launching electron-vite.
const { spawnSync } = require('child_process')
const env = Object.assign({}, process.env)
env.ELECTRON_RUN_AS_NODE = undefined

const result = spawnSync('npx', ['electron-vite', 'dev'], {
  stdio: 'inherit',
  env,
  shell: true,
})
process.exit(result.status ?? 0)
