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
import { app } from 'electron'
import { pipeline } from 'stream/promises'
import { getDb } from '../../database'
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

export async function restoreBackup(key: string) {
  const config = getBackupConfig()
  if (!config) {
    throw new Error('Configuração de backup não encontrada.')
  }

  const s3 = await getS3Client(config)
  const dbPath = join(app.getPath('userData'), 'dezem.db')
  const tempRestorePath = join(app.getPath('temp'), 'restore.db')
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )

  if (!response.Body) {
    throw new Error('Corpo do arquivo de backup está vazio.')
  }

  // Baixar e descompactar
  const gunzip = createGunzip()
  const destination = createWriteStream(tempRestorePath)
  await pipeline(response.Body as any, gunzip, destination)

  // Fechar conexão do banco para liberar o arquivo
  getDb().close()

  // Substituir o banco
  copyFileSync(tempRestorePath, dbPath)
  unlinkSync(tempRestorePath)

  // Reiniciar aplicação
  app.relaunch()
  app.exit(0)

  return { ok: true }
}
