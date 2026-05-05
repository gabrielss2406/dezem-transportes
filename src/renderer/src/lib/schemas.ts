import { z } from 'zod'

export const idSchema = z.number().int().positive()

export const customerSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  ie: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const productSchema = z.object({
  name: z.string().min(1),
  unit: z.string().optional(),
})

export const supplierSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  phone: z.string().optional(),
})

export const truckSchema = z.object({
  license_plate: z.string().min(7),
  model: z.string().min(1),
  year: z.number().int().positive(),
  capacity_ton: z.number().positive(),
  current_odometer: z.number().int().positive().optional(),
})

export const driverSchema = z.object({
  name: z.string().min(1),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  monthly_salary: z.number().positive(),
  truck_id: z.number().int().positive().optional(),
})

export const routeSchema = z.object({
  name: z.string().min(1),
  distance_km: z.number().positive(),
})

export const tripSchema = z.object({
  date: z.string(),
  truck_id: z.number().int().positive(),
  driver_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  customer_id: z.number().int().positive().optional(),
  route_id: z.number().int().positive().optional(),
  supplier_id: z.number().int().positive().optional(),
  weight_ton: z.number().positive(),
  price_charged: z.number().positive(),
  km_driven: z.number().positive(),
  observation: z.string().optional(),
})

export const costSchema = z.object({
  date: z.string(),
  category: z.string().min(1),
  value: z.number().positive(),
  truck_id: z.number().int().positive().optional(),
  supplier_id: z.number().int().positive().optional(),
  driver_id: z.number().int().positive().optional(),
  description: z.string().optional(),
})
