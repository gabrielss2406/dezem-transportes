import { ipcMain } from 'electron'
import { getDb } from './database'
import bcrypt from 'bcryptjs'

export function registerHandlers(): void {
  const db = () => getDb()

  // ── AUTH ────────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', (_e, senha: string) => {
    const user = db().prepare('SELECT * FROM usuarios LIMIT 1').get() as any
    if (!user) return { ok: false, error: 'Nenhum usuário cadastrado' }
    const ok = bcrypt.compareSync(senha, user.senha_hash)
    return ok ? { ok: true, nome: user.nome } : { ok: false, error: 'Senha incorreta' }
  })

  ipcMain.handle('auth:trocarSenha', (_e, senhaAtual: string, novaSenha: string) => {
    const user = db().prepare('SELECT * FROM usuarios LIMIT 1').get() as any
    if (!bcrypt.compareSync(senhaAtual, user.senha_hash)) return { ok: false, error: 'Senha atual incorreta' }
    const hash = bcrypt.hashSync(novaSenha, 10)
    db().prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hash, user.id)
    return { ok: true }
  })

  // ── CLIENTES ────────────────────────────────────────────────────────────────
  ipcMain.handle('clientes:listar', (_e, busca = '') => {
    return db().prepare(`SELECT * FROM clientes WHERE nome LIKE ? ORDER BY nome`).all(`%${busca}%`)
  })

  ipcMain.handle('clientes:criar', (_e, data: any) => {
    const r = db().prepare(`INSERT INTO clientes (nome, cnpj, ie, telefone, endereco) VALUES (?,?,?,?,?)`)
      .run(data.nome, data.cnpj, data.ie, data.telefone, data.endereco)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('clientes:editar', (_e, id: number, data: any) => {
    db().prepare(`UPDATE clientes SET nome=?, cnpj=?, ie=?, telefone=?, endereco=? WHERE id=?`)
      .run(data.nome, data.cnpj, data.ie, data.telefone, data.endereco, id)
    return { ok: true }
  })

  ipcMain.handle('clientes:deletar', (_e, id: number) => {
    db().prepare('DELETE FROM clientes WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── PRODUTOS ────────────────────────────────────────────────────────────────
  ipcMain.handle('produtos:listar', (_e, busca = '') => {
    return db().prepare(`SELECT * FROM produtos WHERE nome LIKE ? ORDER BY nome`).all(`%${busca}%`)
  })

  ipcMain.handle('produtos:criar', (_e, data: any) => {
    const r = db().prepare(`INSERT INTO produtos (nome, unidade) VALUES (?,?)`).run(data.nome, data.unidade || 'ton')
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('produtos:editar', (_e, id: number, data: any) => {
    db().prepare(`UPDATE produtos SET nome=?, unidade=? WHERE id=?`).run(data.nome, data.unidade, id)
    return { ok: true }
  })

  ipcMain.handle('produtos:deletar', (_e, id: number) => {
    db().prepare('DELETE FROM produtos WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── FORNECEDORES ────────────────────────────────────────────────────────────
  ipcMain.handle('fornecedores:listar', (_e, busca = '') => {
    return db().prepare(`SELECT * FROM fornecedores WHERE nome LIKE ? ORDER BY nome`).all(`%${busca}%`)
  })

  ipcMain.handle('fornecedores:criar', (_e, data: any) => {
    const r = db().prepare(`INSERT INTO fornecedores (nome, tipo, telefone) VALUES (?,?,?)`)
      .run(data.nome, data.tipo, data.telefone)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('fornecedores:editar', (_e, id: number, data: any) => {
    db().prepare(`UPDATE fornecedores SET nome=?, tipo=?, telefone=? WHERE id=?`)
      .run(data.nome, data.tipo, data.telefone, id)
    return { ok: true }
  })

  ipcMain.handle('fornecedores:deletar', (_e, id: number) => {
    db().prepare('DELETE FROM fornecedores WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── CAMINHÕES ───────────────────────────────────────────────────────────────
  ipcMain.handle('caminhoes:listar', () => {
    return db().prepare('SELECT * FROM caminhoes ORDER BY placa').all()
  })

  ipcMain.handle('caminhoes:criar', (_e, data: any) => {
    const r = db().prepare(`INSERT INTO caminhoes (placa, modelo, ano, capacidade_ton, odometro_atual) VALUES (?,?,?,?,?)`)
      .run(data.placa, data.modelo, data.ano, data.capacidade_ton, data.odometro_atual || 0)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('caminhoes:editar', (_e, id: number, data: any) => {
    db().prepare(`UPDATE caminhoes SET placa=?, modelo=?, ano=?, capacidade_ton=? WHERE id=?`)
      .run(data.placa, data.modelo, data.ano, data.capacidade_ton, id)
    return { ok: true }
  })

  ipcMain.handle('caminhoes:deletar', (_e, id: number) => {
    db().prepare('DELETE FROM caminhoes WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── MOTORISTAS ──────────────────────────────────────────────────────────────
  ipcMain.handle('motoristas:listar', () => {
    return db().prepare(`
      SELECT m.*, c.placa as caminhao_placa
      FROM motoristas m
      LEFT JOIN caminhoes c ON m.caminhao_id = c.id
      ORDER BY m.nome
    `).all()
  })

  ipcMain.handle('motoristas:criar', (_e, data: any) => {
    const r = db().prepare(`INSERT INTO motoristas (nome, cpf, telefone, salario_mensal, caminhao_id) VALUES (?,?,?,?,?)`)
      .run(data.nome, data.cpf, data.telefone, data.salario_mensal, data.caminhao_id || null)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('motoristas:editar', (_e, id: number, data: any) => {
    db().prepare(`UPDATE motoristas SET nome=?, cpf=?, telefone=?, salario_mensal=?, caminhao_id=? WHERE id=?`)
      .run(data.nome, data.cpf, data.telefone, data.salario_mensal, data.caminhao_id || null, id)
    return { ok: true }
  })

  ipcMain.handle('motoristas:deletar', (_e, id: number) => {
    db().prepare('DELETE FROM motoristas WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── ROTAS ───────────────────────────────────────────────────────────────────
  ipcMain.handle('rotas:listar', () => db().prepare('SELECT * FROM rotas ORDER BY nome').all())

  ipcMain.handle('rotas:criar', (_e, data: any) => {
    const r = db().prepare('INSERT INTO rotas (nome, distancia_km) VALUES (?,?)').run(data.nome, data.distancia_km)
    return { id: r.lastInsertRowid }
  })

  // ── VIAGENS ─────────────────────────────────────────────────────────────────
  ipcMain.handle('viagens:listar', (_e, filtros: any = {}) => {
    let query = `
      SELECT v.*,
        c.placa  as caminhao_placa, c.modelo as caminhao_modelo,
        m.nome   as motorista_nome,
        p.nome   as produto_nome,
        cl.nome  as cliente_nome,
        r.nome   as rota_nome
      FROM viagens v
      JOIN caminhoes c ON v.caminhao_id = c.id
      JOIN motoristas m ON v.motorista_id = m.id
      JOIN produtos p ON v.produto_id = p.id
      LEFT JOIN clientes cl ON v.cliente_id = cl.id
      LEFT JOIN rotas r ON v.rota_id = r.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filtros.dataInicio) { query += ' AND v.data >= ?'; params.push(filtros.dataInicio) }
    if (filtros.dataFim)    { query += ' AND v.data <= ?'; params.push(filtros.dataFim) }
    if (filtros.caminhao_id) { query += ' AND v.caminhao_id = ?'; params.push(filtros.caminhao_id) }
    if (filtros.motorista_id) { query += ' AND v.motorista_id = ?'; params.push(filtros.motorista_id) }
    query += ' ORDER BY v.data DESC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('viagens:criar', (_e, data: any) => {
    const r = db().transaction(() => {
      const res = db().prepare(`
        INSERT INTO viagens (data, caminhao_id, motorista_id, produto_id, cliente_id, rota_id, fornecedor_id, peso_ton, preco_cobrado, km_percorrido, observacao)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        data.data, data.caminhao_id, data.motorista_id, data.produto_id,
        data.cliente_id || null, data.rota_id || null, data.fornecedor_id || null,
        data.peso_ton, data.preco_cobrado, data.km_percorrido, data.observacao || null
      )
      // Atualiza odômetro do caminhão automaticamente
      db().prepare('UPDATE caminhoes SET odometro_atual = odometro_atual + ? WHERE id = ?')
        .run(data.km_percorrido, data.caminhao_id)
      return res
    })()
    return { id: (r as any).lastInsertRowid }
  })

  ipcMain.handle('viagens:deletar', (_e, id: number) => {
    db().prepare('DELETE FROM viagens WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── CUSTOS ──────────────────────────────────────────────────────────────────
  ipcMain.handle('custos:listar', (_e, filtros: any = {}) => {
    let query = `
      SELECT cu.*,
        c.placa as caminhao_placa,
        f.nome  as fornecedor_nome,
        m.nome  as motorista_nome
      FROM custos cu
      LEFT JOIN caminhoes c ON cu.caminhao_id = c.id
      LEFT JOIN fornecedores f ON cu.fornecedor_id = f.id
      LEFT JOIN motoristas m ON cu.motorista_id = m.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filtros.dataInicio)  { query += ' AND cu.data >= ?'; params.push(filtros.dataInicio) }
    if (filtros.dataFim)     { query += ' AND cu.data <= ?'; params.push(filtros.dataFim) }
    if (filtros.categoria)   { query += ' AND cu.categoria = ?'; params.push(filtros.categoria) }
    if (filtros.caminhao_id) { query += ' AND cu.caminhao_id = ?'; params.push(filtros.caminhao_id) }
    query += ' ORDER BY cu.data DESC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('custos:criar', (_e, data: any) => {
    const r = db().prepare(`
      INSERT INTO custos (data, categoria, valor, caminhao_id, fornecedor_id, motorista_id, descricao)
      VALUES (?,?,?,?,?,?,?)
    `).run(data.data, data.categoria, data.valor, data.caminhao_id || null, data.fornecedor_id || null, data.motorista_id || null, data.descricao || null)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('custos:deletar', (_e, id: number) => {
    db().prepare('DELETE FROM custos WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('custos:lancarSalariosMes', (_e, mesAno: string) => {
    // mesAno format: 'YYYY-MM'
    const motoristas = db().prepare(`SELECT * FROM motoristas WHERE ativo = 1`).all() as any[]
    const data = `${mesAno}-01`
    let lancados = 0
    const insert = db().prepare(`
      INSERT INTO custos (data, categoria, valor, motorista_id, descricao)
      VALUES (?, 'salario', ?, ?, ?)
    `)
    const transaction = db().transaction(() => {
      for (const m of motoristas) {
        // Verifica se já foi lançado
        const existente = db().prepare(`
          SELECT id FROM custos WHERE categoria='salario' AND motorista_id=? AND data LIKE ?
        `).get(m.id, `${mesAno}%`)
        if (!existente) {
          insert.run(data, m.salario_mensal, m.id, `Salário ${m.nome} — ${mesAno}`)
          lancados++
        }
      }
    })
    transaction()
    return { ok: true, lancados }
  })

  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  ipcMain.handle('dashboard:resumo', (_e, dataInicio: string, dataFim: string) => {
    const receita = (db().prepare(`
      SELECT COALESCE(SUM(preco_cobrado), 0) as total FROM viagens WHERE data BETWEEN ? AND ?
    `).get(dataInicio, dataFim) as any).total

    const custo = (db().prepare(`
      SELECT COALESCE(SUM(valor), 0) as total FROM custos WHERE data BETWEEN ? AND ?
    `).get(dataInicio, dataFim) as any).total

    const totalViagens = (db().prepare(`
      SELECT COUNT(*) as c FROM viagens WHERE data BETWEEN ? AND ?
    `).get(dataInicio, dataFim) as any).c

    const kmTotal = (db().prepare(`
      SELECT COALESCE(SUM(km_percorrido), 0) as total FROM viagens WHERE data BETWEEN ? AND ?
    `).get(dataInicio, dataFim) as any).total

    const porCaminhao = db().prepare(`
      SELECT c.placa, c.modelo,
        COALESCE(SUM(v.preco_cobrado), 0) as receita,
        COALESCE(SUM(v.km_percorrido), 0) as km
      FROM caminhoes c
      LEFT JOIN viagens v ON v.caminhao_id = c.id AND v.data BETWEEN ? AND ?
      GROUP BY c.id
      ORDER BY receita DESC
    `).all(dataInicio, dataFim)

    const porProduto = db().prepare(`
      SELECT p.nome,
        COALESCE(SUM(v.peso_ton), 0) as tonelagem,
        COUNT(v.id) as viagens
      FROM produtos p
      LEFT JOIN viagens v ON v.produto_id = p.id AND v.data BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY tonelagem DESC
    `).all(dataInicio, dataFim)

    const porCategoria = db().prepare(`
      SELECT categoria, COALESCE(SUM(valor), 0) as total
      FROM custos WHERE data BETWEEN ? AND ?
      GROUP BY categoria ORDER BY total DESC
    `).all(dataInicio, dataFim)

    return {
      receita,
      custo,
      lucro: receita - custo,
      totalViagens,
      kmTotal,
      porCaminhao,
      porProduto,
      porCategoria
    }
  })
}
