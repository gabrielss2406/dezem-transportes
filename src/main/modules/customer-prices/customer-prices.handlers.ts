import { ipcMain } from 'electron'
import { customerPriceSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createValidatedHandler } from '../../lib/utils'

export function registerCustomerPricesHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('customer-prices:listByCustomer', (_e, customerId: number) => {
    return db()
      .prepare(
        `
      SELECT cp.price, p.name as productName, cp.product_id as productId, cp.customer_id as customerId
      FROM customer_prices cp
      JOIN products p ON p.id = cp.product_id
      WHERE cp.customer_id = ?
      ORDER BY p.name
    `,
      )
      .all(customerId)
  })

  ipcMain.handle('customer-prices:listByProduct', (_e, productId: number) => {
    return db()
      .prepare(
        `
      SELECT cp.price, c.name as customerName, cp.product_id as productId, cp.customer_id as customerId
      FROM customer_prices cp
      JOIN customers c ON c.id = cp.customer_id
      WHERE cp.product_id = ?
      ORDER BY c.name
    `,
      )
      .all(productId)
  })

  ipcMain.handle('customer-prices:listAll', () => {
    return db()
      .prepare(
        `
      SELECT 
        c.name as customerName, 
        p.name as productName, 
        cp.customer_id as customerId, 
        cp.product_id as productId, 
        cp.price
      FROM customer_prices cp
      JOIN customers c ON c.id = cp.customer_id
      JOIN products p ON p.id = cp.product_id
      ORDER BY c.name, p.name
    `,
      )
      .all()
  })

  createValidatedHandler('customer-prices:set', customerPriceSchema, (data) => {
    const { customerId, productId, price } = data
    db()
      .prepare(
        `
      INSERT INTO customer_prices (customer_id, product_id, price)
      VALUES (?, ?, ?)
      ON CONFLICT(customer_id, product_id) DO UPDATE SET price = excluded.price
    `,
      )
      .run(customerId, productId, price)
    return { ok: true }
  })

  ipcMain.handle('customer-prices:delete', (_e, customerId: number, productId: number) => {
    db()
      .prepare('DELETE FROM customer_prices WHERE customer_id = ? AND product_id = ?')
      .run(customerId, productId)
    return { ok: true }
  })

  ipcMain.handle('customer-prices:getPrice', (_e, customerId: number, productId: number) => {
    return db()
      .prepare('SELECT price FROM customer_prices WHERE customer_id = ? AND product_id = ?')
      .get(customerId, productId)
  })
}
