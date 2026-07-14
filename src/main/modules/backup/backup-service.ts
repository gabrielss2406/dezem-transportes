import { copyFileSync, createReadStream, createWriteStream, unlinkSync } from 'fs'
import { join } from 'path'
import { createGunzip, createGzip } from 'zlib'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { pipeline } from 'stream/promises'
import { getDb, setupDatabase } from '../../database'
import { reloadAppWindow } from '../../window'
import { getBackupConfig, saveBackupStatus } from './backup-config'

async function getS3Client(config: any) {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export async function performBackup() {
  const config = getBackupConfig()
  if (!config) {
    throw new Error('Configuração de backup não encontrada.')
  }

  const dbPath = join(app.getPath('userData'), 'dezem.db')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  // Nomes dos arquivos
  const rawFileName = `backup-${timestamp}.db`
  const compressedFileName = `${rawFileName}.gz`
  const backupKey = `dezem/${compressedFileName}`

  // Caminhos temporários
  const tempRawPath = join(app.getPath('temp'), rawFileName)
  const tempCompressedPath = join(app.getPath('temp'), compressedFileName)

  try {
    // 1. Criar cópia local (evita locks)
    copyFileSync(dbPath, tempRawPath)

    // 2. Compactar (Gzip)
    const gzip = createGzip()
    const source = createReadStream(tempRawPath)
    const destination = createWriteStream(tempCompressedPath)
    await pipeline(source, gzip, destination)

    const s3 = await getS3Client(config)

    // 3. Fazer upload do arquivo compactado
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: backupKey,
        Body: createReadStream(tempCompressedPath),
      }),
    )

    // 4. Listar para aplicar retenção
    const listedObjects = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: 'dezem/backup-',
      }),
    )

    if (listedObjects.Contents && listedObjects.Contents.length > 3) {
      const sortedBackups = listedObjects.Contents.filter(
        (obj) => obj.Key && obj.LastModified,
      ).sort((a, b) => (a.LastModified?.getTime() || 0) - (b.LastModified?.getTime() || 0))

      const toDelete = sortedBackups.slice(0, sortedBackups.length - 3)

      if (toDelete.length > 0) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: {
              Objects: toDelete.map((d) => ({ Key: d.Key })),
            },
          }),
        )
      }
    }

    saveBackupStatus({ ok: true, timestamp: new Date().toISOString() })
  } catch (error: any) {
    saveBackupStatus({ ok: false, timestamp: new Date().toISOString(), error: error.message })
    throw error
  } finally {
    // 5. Limpar arquivos temporários
    for (const path of [tempRawPath, tempCompressedPath]) {
      try {
        unlinkSync(path)
      } catch (e) {}
    }
  }
}

export async function listBackups() {
  const config = getBackupConfig()
  if (!config) {
    throw new Error('Configuração de backup não encontrada.')
  }

  const s3 = await getS3Client(config)
  const listedObjects = await s3.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: 'dezem/',
    }),
  )

  if (!listedObjects.Contents) {
    return []
  }

  return listedObjects.Contents.filter((obj) => obj.Key?.endsWith('.db.gz'))
    .map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
    }))
    .sort(
      (a, b) => new Date(b.lastModified || '').getTime() - new Date(a.lastModified || '').getTime(),
    )
}

interface BackupAnalysis {
  timestamp: string
  tables: {
    name: string
    count: number
    columns: string[]
  }[]
  stats: {
    trips: number
    costs: number
    drivers: number
    trucks: number
    customers: number
    products: number
    suppliers: number
  }
  warnings: string[]
  size_mb: number
}

async function analyzeBackupFile(backupPath: string): Promise<BackupAnalysis> {
  const backupDb = new Database(backupPath)
  backupDb.pragma('journal_mode = WAL')

  const warnings: string[] = []
  const tables: BackupAnalysis['tables'] = []

  // Analisar cada tabela importante
  const tablesList = ['trips', 'costs', 'drivers', 'trucks', 'customers', 'products', 'suppliers']

  for (const tableName of tablesList) {
    try {
      const info = backupDb.pragma(`table_info(${tableName})`) as { name: string }[]
      const countResult = backupDb.prepare(`SELECT COUNT(*) as c FROM ${tableName}`).get() as {
        c: number
      }
      const count = countResult.c

      tables.push({
        name: tableName,
        count,
        columns: info.map((c) => c.name),
      })

      // Verificar se faltam colunas esperadas
      const expectedCols = {
        trips: ['overweight_ton', 'ticket_number', 'has_percentage_tax', 'has_commission'],
        costs: [],
        drivers: ['is_outsourced', 'contractor_id'],
        trucks: ['is_outsourced', 'contractor_id', 'customId'],
      }

      if (tableName in expectedCols) {
        const missing = (expectedCols[tableName as keyof typeof expectedCols] || []).filter(
          (col) => !info.some((c) => c.name === col),
        )
        if (missing.length > 0) {
          warnings.push(
            `Tabela '${tableName}' não tem colunas: ${missing.join(', ')}. Serão recriadas automaticamente.`,
          )
        }
      }
    } catch (error) {
      tables.push({ name: tableName, count: 0, columns: [] })
      warnings.push(`Erro ao analisar tabela '${tableName}': ${(error as Error).message}`)
    }
  }

  backupDb.close()

  return {
    timestamp: new Date().toISOString(),
    tables,
    stats: {
      trips: tables.find((t) => t.name === 'trips')?.count || 0,
      costs: tables.find((t) => t.name === 'costs')?.count || 0,
      drivers: tables.find((t) => t.name === 'drivers')?.count || 0,
      trucks: tables.find((t) => t.name === 'trucks')?.count || 0,
      customers: tables.find((t) => t.name === 'customers')?.count || 0,
      products: tables.find((t) => t.name === 'products')?.count || 0,
      suppliers: tables.find((t) => t.name === 'suppliers')?.count || 0,
    },
    warnings,
    size_mb: 0,
  }
}

export async function analyzeBackup(key: string): Promise<BackupAnalysis> {
  const config = getBackupConfig()
  if (!config) {
    throw new Error('Configuração de backup não encontrada.')
  }

  const s3 = await getS3Client(config)
  const tempAnalyzePath = join(app.getPath('temp'), 'analyze-backup.db')

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    )

    if (!response.Body) {
      throw new Error('Corpo do arquivo de backup está vazio.')
    }

    const gunzip = createGunzip()
    const destination = createWriteStream(tempAnalyzePath)
    await pipeline(response.Body as any, gunzip, destination)

    const analysis = await analyzeBackupFile(tempAnalyzePath)

    return analysis
  } finally {
    try {
      unlinkSync(tempAnalyzePath)
    } catch (e) {}
  }
}

export async function restoreBackup(key: string) {
  const config = getBackupConfig()
  if (!config) {
    throw new Error('Configuração de backup não encontrada.')
  }

  console.log(`[Backup] Iniciando restauração do backup: ${key}`)

  const s3 = await getS3Client(config)
  const dbPath = join(app.getPath('userData'), 'dezem.db')
  const tempRestorePath = join(app.getPath('temp'), 'restore.db')

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    )

    if (!response.Body) {
      throw new Error('Corpo do arquivo de backup está vazio.')
    }

    console.log('[Backup] Baixando e descompactando arquivo...')
    // Baixar e descompactar
    const gunzip = createGunzip()
    const destination = createWriteStream(tempRestorePath)
    await pipeline(response.Body as any, gunzip, destination)

    // Fazer análise rápida do backup antes de restaurar
    const analysis = await analyzeBackupFile(tempRestorePath)
    console.log('[Backup] Dados no backup:', analysis.stats)

    console.log('[Backup] Fechando conexão com banco de dados atual...')
    const currentDb = getDb()
    try {
      currentDb.pragma('wal_checkpoint(TRUNCATE)')
    } catch (checkpointError) {
      console.warn('[Backup] Falha ao fazer checkpoint do WAL antes de fechar:', checkpointError)
    }
    currentDb.close()

    console.log('[Backup] Removendo arquivos WAL/SHM residuais do banco anterior...')
    for (const suffix of ['-wal', '-shm']) {
      try {
        unlinkSync(`${dbPath}${suffix}`)
      } catch (e) {
        // Arquivo pode não existir — ok ignorar
      }
    }

    console.log('[Backup] Substituindo arquivo de banco de dados...')
    copyFileSync(tempRestorePath, dbPath)

    if (app.isPackaged) {
      console.log('[Backup] Restauração concluída com sucesso. Reiniciando aplicação...')
      app.relaunch()
      app.exit(0)
    } else {
      console.log(
        '[Backup] Restauração concluída (modo dev). Reabrindo banco de dados e recarregando janela...',
      )
      setupDatabase()
      await reloadAppWindow()
    }
  } catch (error) {
    console.error('[Backup] Erro durante restauração:', error)
    throw error
  } finally {
    try {
      unlinkSync(tempRestorePath)
    } catch (e) {}
  }

  return { ok: true }
}
