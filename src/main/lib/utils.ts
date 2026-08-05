import { BrowserWindow, ipcMain } from 'electron'
import { ZodError, z } from 'zod'

// Type guard for SqliteError
interface SqliteError extends Error {
  code: string
}

function isSqliteError(error: unknown): error is SqliteError {
  return error instanceof Error && 'code' in error
}

// Helper to format Zod errors into a structured object
function formatZodError(error: ZodError): Record<string, string> {
  return error.issues.reduce(
    (acc, e) => {
      const path = e.path.join('.')
      if (path) {
        acc[path] = e.message
      }
      return acc
    },
    {} as Record<string, string>,
  )
}

// Extracts the column name from a UNIQUE constraint error message
function getUniqueConstraintField(message: string): string | null {
  const match = message.match(/UNIQUE constraint failed: \w+\.(\w+)/)
  return match ? match[1] : null
}

// A handler result of { ok: false, ... } means the mutation was rejected (validation/constraint
// error), so nothing actually changed and no refresh notification should be sent.
function wasMutationApplied(result: unknown): boolean {
  return !(result && typeof result === 'object' && (result as any).ok === false)
}

// Notifies all renderer windows that an entity changed, so views like the Dashboard
// (which aggregate data across many tables) can refetch instead of showing stale data.
function broadcastDataChanged(channel: string): void {
  const entity = channel.split(':')[0]
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('data:changed', entity)
  }
}

export function createValidatedHandler<T extends z.ZodRawShape>(
  channel: string,
  schema: z.ZodObject<T>,
  handler: (data: z.infer<typeof schema>) => any,
) {
  ipcMain.handle(channel, async (_event, data) => {
    try {
      const validatedData = await schema.parseAsync(data)
      const result = await handler(validatedData)
      if (wasMutationApplied(result)) {
        broadcastDataChanged(channel)
      }
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, errors: formatZodError(error) }
      }
      if (isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const field = getUniqueConstraintField(error.message)
        if (field) {
          // Assuming DB column name matches form field name (e.g., customId, license_plate)
          return { ok: false, errors: { [field]: 'Este valor já está em uso.' } }
        }
      }
      // Log the unexpected error for debugging
      console.error(`Unexpected error in ${channel}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
      return { ok: false, errors: { form: errorMessage } }
    }
  })
}

export function createValidatedHandlerWithId<T extends z.ZodRawShape>(
  channel: string,
  schema: z.ZodObject<T>,
  handler: (id: number, data: z.infer<typeof schema>) => any,
) {
  ipcMain.handle(channel, async (_event, id, data) => {
    try {
      const validatedId = await z.number().int().positive().parseAsync(id)
      const validatedData = await schema.parseAsync(data)
      const result = await handler(validatedId, validatedData)
      if (wasMutationApplied(result)) {
        broadcastDataChanged(channel)
      }
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, errors: formatZodError(error) }
      }
      if (isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const field = getUniqueConstraintField(error.message)
        if (field) {
          // Assuming DB column name matches form field name (e.g., customId, license_plate)
          return { ok: false, errors: { [field]: 'Este valor já está em uso.' } }
        }
      }
      console.error(`Unexpected error in ${channel}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
      return { ok: false, errors: { form: errorMessage } }
    }
  })
}

export function createIdValidatedHandler(channel: string, handler: (id: number) => any) {
  ipcMain.handle(channel, async (_event, id) => {
    try {
      const validatedId = await z.number().int().positive().parseAsync(id)
      const result = await handler(validatedId)
      if (wasMutationApplied(result)) {
        broadcastDataChanged(channel)
      }
      return result
    } catch (error) {
      if (error instanceof ZodError) {
        // Since this handler only validates an ID, we can return a simpler error
        return { ok: false, errors: { id: 'ID inválido.' } }
      }
      if (isSqliteError(error) && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const field = getUniqueConstraintField(error.message)
        if (field) {
          // Assuming DB column name matches form field name (e.g., customId, license_plate)
          return { ok: false, errors: { [field]: 'Este valor já está em uso.' } }
        }
      }
      console.error(`Unexpected error in ${channel}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
      return { ok: false, errors: { form: errorMessage } }
    }
  })
}
