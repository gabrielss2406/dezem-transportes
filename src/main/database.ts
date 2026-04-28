import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import bcrypt from 'bcryptjs'

let db: Database.Database

export function getDb(): Database.Database {
  return db
}

export function setupDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'dezem.db')
  db = new Database(dbPath)

  // Performance pragmas
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    -- Auth
    CREATE TABLE IF NOT EXISTS usuarios (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT    NOT NULL,
      senha_hash TEXT   NOT NULL,
      criado_em TEXT    DEFAULT (datetime('now'))
    );

    -- Clientes
    CREATE TABLE IF NOT EXISTS clientes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT NOT NULL,
      cnpj       TEXT,
      ie         TEXT,
      telefone   TEXT,
      endereco   TEXT,
      criado_em  TEXT DEFAULT (datetime('now'))
    );

    -- Produtos
    CREATE TABLE IF NOT EXISTS produtos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL,
      unidade   TEXT NOT NULL DEFAULT 'ton',
      criado_em TEXT DEFAULT (datetime('now'))
    );

    -- Fornecedores
    CREATE TABLE IF NOT EXISTS fornecedores (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL,
      tipo      TEXT NOT NULL CHECK(tipo IN ('posto','oficina','pedreira','outro')),
      telefone  TEXT,
      criado_em TEXT DEFAULT (datetime('now'))
    );

    -- Caminhões
    CREATE TABLE IF NOT EXISTS caminhoes (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      placa            TEXT NOT NULL UNIQUE,
      modelo           TEXT NOT NULL,
      ano              INTEGER,
      capacidade_ton   REAL,
      odometro_atual   REAL NOT NULL DEFAULT 0,
      criado_em        TEXT DEFAULT (datetime('now'))
    );

    -- Motoristas
    CREATE TABLE IF NOT EXISTS motoristas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT NOT NULL,
      cpf           TEXT,
      telefone      TEXT,
      salario_mensal REAL NOT NULL DEFAULT 0,
      caminhao_id   INTEGER REFERENCES caminhoes(id),
      ativo         INTEGER NOT NULL DEFAULT 1,
      criado_em     TEXT DEFAULT (datetime('now'))
    );

    -- Rotas
    CREATE TABLE IF NOT EXISTS rotas (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome      TEXT NOT NULL,
      distancia_km REAL,
      criado_em TEXT DEFAULT (datetime('now'))
    );

    -- Viagens
    CREATE TABLE IF NOT EXISTS viagens (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      data            TEXT NOT NULL,
      caminhao_id     INTEGER NOT NULL REFERENCES caminhoes(id),
      motorista_id    INTEGER NOT NULL REFERENCES motoristas(id),
      produto_id      INTEGER NOT NULL REFERENCES produtos(id),
      cliente_id      INTEGER REFERENCES clientes(id),
      rota_id         INTEGER REFERENCES rotas(id),
      fornecedor_id   INTEGER REFERENCES fornecedores(id),
      peso_ton        REAL NOT NULL DEFAULT 0,
      preco_cobrado   REAL NOT NULL DEFAULT 0,
      km_percorrido   REAL NOT NULL DEFAULT 0,
      observacao      TEXT,
      criado_em       TEXT DEFAULT (datetime('now'))
    );

    -- Custos
    CREATE TABLE IF NOT EXISTS custos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      data           TEXT NOT NULL,
      categoria      TEXT NOT NULL CHECK(categoria IN ('combustivel','oleo','manutencao','salario','pedagio','outros')),
      valor          REAL NOT NULL,
      caminhao_id    INTEGER REFERENCES caminhoes(id),
      fornecedor_id  INTEGER REFERENCES fornecedores(id),
      motorista_id   INTEGER REFERENCES motoristas(id),
      descricao      TEXT,
      criado_em      TEXT DEFAULT (datetime('now'))
    );

    -- Índices para performance nas consultas frequentes
    CREATE INDEX IF NOT EXISTS idx_viagens_data        ON viagens(data);
    CREATE INDEX IF NOT EXISTS idx_viagens_caminhao    ON viagens(caminhao_id);
    CREATE INDEX IF NOT EXISTS idx_viagens_motorista   ON viagens(motorista_id);
    CREATE INDEX IF NOT EXISTS idx_custos_data         ON custos(data);
    CREATE INDEX IF NOT EXISTS idx_custos_categoria    ON custos(categoria);
  `)

  // Seed: usuário admin padrão se não existir
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM usuarios').get() as any).c
  if (userCount === 0) {
    const hash = bcrypt.hashSync('dezem2024', 10)
    db.prepare('INSERT INTO usuarios (nome, senha_hash) VALUES (?, ?)').run('Admin', hash)
  }

  console.log('[DB] SQLite pronto em:', dbPath)
}
