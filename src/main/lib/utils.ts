import { ipcMain } from 'electron'
import { ZodError, z } from 'zod'
import { isValidCNPJ, isValidCPF, isValidPhone } from '../../shared/validation'

type IpcHandler = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any

export function createValidatedHandler<T extends z.ZodRawShape>(
  channel: string,
  schema: z.ZodObject<T>,
  handler: (data: z.infer<typeof schema>) => any,
) {
  ipcMain.handle(channel, async (_event, data) => {
    try {
      const validatedData = await schema.parseAsync(data)
      return handler(validatedData)
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      // Log the unexpected error for debugging
      console.error(`Unexpected error in ${channel}:`, error)
      return { ok: false, error: 'Ocorreu um erro inesperado no servidor.' }
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
      return handler(validatedId, validatedData)
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      console.error(`Unexpected error in ${channel}:`, error)
      return { ok: false, error: 'Ocorreu um erro inesperado no servidor.' }
    }
  })
}

export function createIdValidatedHandler(channel: string, handler: (id: number) => any) {
  ipcMain.handle(channel, async (_event, id) => {
    try {
      const validatedId = await z.number().int().positive().parseAsync(id)
      return handler(validatedId)
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      console.error(`Unexpected error in ${channel}:`, error)
      return { ok: false, error: 'Ocorreu um erro inesperado no servidor.' }
    }
  })
}
