import bcrypt from 'bcryptjs'
import { ipcMain } from 'electron'
import { getDb } from '../../database'

export function registerAuthHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('auth:login', (_e, password: string) => {
    const user = db().prepare('SELECT * FROM users LIMIT 1').get() as any
    if (!user) return { ok: false, error: 'Nenhum usuário cadastrado' }
    const ok = bcrypt.compareSync(password, user.password_hash)
    return ok ? { ok: true, name: user.name } : { ok: false, error: 'Senha incorreta' }
  })

  ipcMain.handle('auth:changePassword', (_e, currentPassword: string, newPassword: string) => {
    const user = db().prepare('SELECT * FROM users LIMIT 1').get() as any
    if (!bcrypt.compareSync(currentPassword, user.password_hash))
      return { ok: false, error: 'Senha atual incorreta' }
    const hash = bcrypt.hashSync(newPassword, 10)
    db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id)
    return { ok: true }
  })
}
