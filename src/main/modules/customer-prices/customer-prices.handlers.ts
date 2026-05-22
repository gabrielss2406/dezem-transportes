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
      SELECT 
        customer_prices.price, 
        products.name as productName, 
        products.customId as productCustomId, 
        customer_prices.product_id as productId, 
        customer_prices.customer_id as customerId
      FROM customer_prices
      JOIN products ON products.id = customer_prices.product_id
      WHERE customer_prices.customer_id = ?
      ORDER BY products.name
    `,
      )
      .all(customerId)
  })

  ipcMain.handle('customer-prices:listByProduct', (_e, productId: number) => {
    return db()
      .prepare(
        `
      SELECT 
        customer_prices.price, 
        customers.name as customerName, 
        customers.customId as customerCustomId, 
        customer_prices.product_id as productId, 
        customer_prices.customer_id as customerId
      FROM customer_prices
      JOIN customers ON customers.id = customer_prices.customer_id
      WHERE customer_prices.product_id = ?
      ORDER BY customers.name
    `,
      )
      .all(productId)
  })

  ipcMain.handle('customer-prices:listAll', () => {
    return db()
      .prepare(
        `
      SELECT 
        customers.name as customerName, 
        customers.customId as customerCustomId,
        products.name as productName, 
        products.customId as productCustomId,
        customer_prices.customer_id as customerId, 
        customer_prices.product_id as productId, 
        customer_prices.price
      FROM customer_prices
      JOIN customers ON customers.id = customer_prices.customer_id
      JOIN products ON products.id = customer_prices.product_id
      ORDER BY customers.name, products.name
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
