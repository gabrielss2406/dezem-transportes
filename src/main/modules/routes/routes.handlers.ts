import { ipcMain } from 'electron'
import { idSchema, routeSchema, waypointsSchema, z } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createValidatedHandler } from '../../lib/utils'

export function registerRouteHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('routes:list', () => {
    const sql = `
      SELECT
        r.id,
        r.name,
        r.distance_km,
        r.customer_id,
        c.name as customer_name
      FROM routes r
      LEFT JOIN customers c ON r.customer_id = c.id
      ORDER BY r.name
    `
    return db().prepare(sql).all()
  })

  createValidatedHandler('routes:create', routeSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO routes (name, distance_km, customer_id) VALUES (?, ?, ?)')
      .run(data.name, data.distance_km, data.customer_id)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandler('routes:update', routeSchema.extend({ id: idSchema }), (data) => {
    const { id, ...rest } = data
    db()
      .prepare('UPDATE routes SET name = ?, distance_km = ?, customer_id = ? WHERE id = ?')
      .run(rest.name, rest.distance_km, rest.customer_id, id)
    return { id }
  })

  createValidatedHandler('routes:delete', idSchema, (id) => {
    db().prepare('DELETE FROM routes WHERE id = ?').run(id)
    return { id }
  })

  ipcMain.handle('routes:getWaypoints', (_e, route_id: number) => {
    return db()
      .prepare(
        'SELECT id, name, sequence FROM route_waypoints WHERE route_id = ? ORDER BY sequence',
      )
      .all(route_id)
  })

  createValidatedHandler(
    'routes:updateWaypoints',
    z.object({
      route_id: idSchema,
      waypoints: waypointsSchema,
    }),
    (data) => {
      const { route_id, waypoints } = data
      const transaction = db().transaction(() => {
        // Delete existing waypoints
        db().prepare('DELETE FROM route_waypoints WHERE route_id = ?').run(route_id)

        // Insert new waypoints
        const insert = db().prepare(
          'INSERT INTO route_waypoints (route_id, name, sequence) VALUES (?, ?, ?)',
        )
        for (const waypoint of waypoints) {
          insert.run(route_id, waypoint.name, waypoint.sequence)
        }
      })
      transaction()
      return { route_id }
    },
  )
}
