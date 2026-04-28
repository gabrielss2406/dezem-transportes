import { contextBridge, ipcRenderer } from 'electron'

// Expõe API segura para o renderer via contextBridge
contextBridge.exposeInMainWorld('api', {
  // Auth
  auth: {
    login: (senha: string) => ipcRenderer.invoke('auth:login', senha),
    trocarSenha: (atual: string, nova: string) => ipcRenderer.invoke('auth:trocarSenha', atual, nova)
  },

  // Clientes
  clientes: {
    listar: (busca?: string) => ipcRenderer.invoke('clientes:listar', busca),
    criar: (data: any) => ipcRenderer.invoke('clientes:criar', data),
    editar: (id: number, data: any) => ipcRenderer.invoke('clientes:editar', id, data),
    deletar: (id: number) => ipcRenderer.invoke('clientes:deletar', id)
  },

  // Produtos
  produtos: {
    listar: (busca?: string) => ipcRenderer.invoke('produtos:listar', busca),
    criar: (data: any) => ipcRenderer.invoke('produtos:criar', data),
    editar: (id: number, data: any) => ipcRenderer.invoke('produtos:editar', id, data),
    deletar: (id: number) => ipcRenderer.invoke('produtos:deletar', id)
  },

  // Fornecedores
  fornecedores: {
    listar: (busca?: string) => ipcRenderer.invoke('fornecedores:listar', busca),
    criar: (data: any) => ipcRenderer.invoke('fornecedores:criar', data),
    editar: (id: number, data: any) => ipcRenderer.invoke('fornecedores:editar', id, data),
    deletar: (id: number) => ipcRenderer.invoke('fornecedores:deletar', id)
  },

  // Caminhões
  caminhoes: {
    listar: () => ipcRenderer.invoke('caminhoes:listar'),
    criar: (data: any) => ipcRenderer.invoke('caminhoes:criar', data),
    editar: (id: number, data: any) => ipcRenderer.invoke('caminhoes:editar', id, data),
    deletar: (id: number) => ipcRenderer.invoke('caminhoes:deletar', id)
  },

  // Motoristas
  motoristas: {
    listar: () => ipcRenderer.invoke('motoristas:listar'),
    criar: (data: any) => ipcRenderer.invoke('motoristas:criar', data),
    editar: (id: number, data: any) => ipcRenderer.invoke('motoristas:editar', id, data),
    deletar: (id: number) => ipcRenderer.invoke('motoristas:deletar', id)
  },

  // Rotas
  rotas: {
    listar: () => ipcRenderer.invoke('rotas:listar'),
    criar: (data: any) => ipcRenderer.invoke('rotas:criar', data)
  },

  // Viagens
  viagens: {
    listar: (filtros?: any) => ipcRenderer.invoke('viagens:listar', filtros),
    criar: (data: any) => ipcRenderer.invoke('viagens:criar', data),
    deletar: (id: number) => ipcRenderer.invoke('viagens:deletar', id)
  },

  // Custos
  custos: {
    listar: (filtros?: any) => ipcRenderer.invoke('custos:listar', filtros),
    criar: (data: any) => ipcRenderer.invoke('custos:criar', data),
    deletar: (id: number) => ipcRenderer.invoke('custos:deletar', id),
    lancarSalariosMes: (mesAno: string) => ipcRenderer.invoke('custos:lancarSalariosMes', mesAno)
  },

  // Dashboard
  dashboard: {
    resumo: (dataInicio: string, dataFim: string) =>
      ipcRenderer.invoke('dashboard:resumo', dataInicio, dataFim)
  }
})
