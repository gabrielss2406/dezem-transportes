export interface Cliente {
  id: number
  nome: string
  cnpj?: string
  ie?: string
  telefone?: string
  endereco?: string
}

export interface Produto {
  id: number
  nome: string
  unidade: string
}

export interface Fornecedor {
  id: number
  nome: string
  tipo: 'posto' | 'oficina' | 'pedreira' | 'outro'
  telefone?: string
}

export interface Caminhao {
  id: number
  placa: string
  modelo: string
  ano?: number
  capacidade_ton?: number
  odometro_atual: number
}

export interface Motorista {
  id: number
  nome: string
  cpf?: string
  telefone?: string
  salario_mensal: number
  caminhao_id?: number
  caminhao_placa?: string
  ativo: number
}

export interface Rota {
  id: number
  nome: string
  distancia_km?: number
}

export interface Viagem {
  id: number
  data: string
  caminhao_id: number
  motorista_id: number
  produto_id: number
  cliente_id?: number
  rota_id?: number
  fornecedor_id?: number
  peso_ton: number
  preco_cobrado: number
  km_percorrido: number
  observacao?: string
  // joins
  caminhao_placa?: string
  caminhao_modelo?: string
  motorista_nome?: string
  produto_nome?: string
  cliente_nome?: string
  rota_nome?: string
}

export interface Custo {
  id: number
  data: string
  categoria: 'combustivel' | 'oleo' | 'manutencao' | 'salario' | 'pedagio' | 'outros'
  valor: number
  caminhao_id?: number
  fornecedor_id?: number
  motorista_id?: number
  descricao?: string
  // joins
  caminhao_placa?: string
  fornecedor_nome?: string
  motorista_nome?: string
}

export interface DashboardResumo {
  receita: number
  custo: number
  lucro: number
  totalViagens: number
  kmTotal: number
  porCaminhao: Array<{ placa: string; modelo: string; receita: number; km: number }>
  porProduto: Array<{ nome: string; tonelagem: number; viagens: number }>
  porCategoria: Array<{ categoria: string; total: number }>
}

// Augment Window
declare global {
  interface Window {
    api: {
      auth: {
        login(senha: string): Promise<{ ok: boolean; nome?: string; error?: string }>
        trocarSenha(atual: string, nova: string): Promise<{ ok: boolean; error?: string }>
      }
      clientes: {
        listar(busca?: string): Promise<Cliente[]>
        criar(data: Omit<Cliente, 'id'>): Promise<{ id: number }>
        editar(id: number, data: Partial<Cliente>): Promise<{ ok: boolean }>
        deletar(id: number): Promise<{ ok: boolean }>
      }
      produtos: {
        listar(busca?: string): Promise<Produto[]>
        criar(data: Omit<Produto, 'id'>): Promise<{ id: number }>
        editar(id: number, data: Partial<Produto>): Promise<{ ok: boolean }>
        deletar(id: number): Promise<{ ok: boolean }>
      }
      fornecedores: {
        listar(busca?: string): Promise<Fornecedor[]>
        criar(data: Omit<Fornecedor, 'id'>): Promise<{ id: number }>
        editar(id: number, data: Partial<Fornecedor>): Promise<{ ok: boolean }>
        deletar(id: number): Promise<{ ok: boolean }>
      }
      caminhoes: {
        listar(): Promise<Caminhao[]>
        criar(data: Omit<Caminhao, 'id'>): Promise<{ id: number }>
        editar(id: number, data: Partial<Caminhao>): Promise<{ ok: boolean }>
        deletar(id: number): Promise<{ ok: boolean }>
      }
      motoristas: {
        listar(): Promise<Motorista[]>
        criar(data: Omit<Motorista, 'id'>): Promise<{ id: number }>
        editar(id: number, data: Partial<Motorista>): Promise<{ ok: boolean }>
        deletar(id: number): Promise<{ ok: boolean }>
      }
      rotas: {
        listar(): Promise<Rota[]>
        criar(data: Omit<Rota, 'id'>): Promise<{ id: number }>
      }
      viagens: {
        listar(filtros?: any): Promise<Viagem[]>
        criar(data: Omit<Viagem, 'id'>): Promise<{ id: number }>
        deletar(id: number): Promise<{ ok: boolean }>
      }
      custos: {
        listar(filtros?: any): Promise<Custo[]>
        criar(data: Omit<Custo, 'id'>): Promise<{ id: number }>
        deletar(id: number): Promise<{ ok: boolean }>
        lancarSalariosMes(mesAno: string): Promise<{ ok: boolean; lancados: number }>
      }
      dashboard: {
        resumo(dataInicio: string, dataFim: string): Promise<DashboardResumo>
      }
    }
  }
}
