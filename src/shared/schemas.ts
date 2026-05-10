import { z } from 'zod'
import { isValidCNPJ, isValidCPF, isValidPhone } from './validation'

export const idSchema = z.number().int().positive()

export const customerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  cnpj: z.string().refine(isValidCNPJ, { message: 'CNPJ inválido' }).optional().or(z.literal('')),
  ie: z.string().max(20).optional(),
  phone: z
    .string()
    .refine(isValidPhone, { message: 'Telefone inválido' })
    .optional()
    .or(z.literal('')),
  address: z.string().max(255).optional(),
})

export const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  unit: z.string().max(10).optional(),
})

export const supplierSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  type: z.string().max(50).optional(),
  phone: z
    .string()
    .refine(isValidPhone, { message: 'Telefone inválido' })
    .optional()
    .or(z.literal('')),
})

export const truckSchema = z.object({
  license_plate: z
    .string()
    .length(7, 'Placa deve ter 7 caracteres')
    .regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Placa em formato inválido'),
  model: z.string().min(2, 'Modelo deve ter no mínimo 2 caracteres').max(50),
  year: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(
      z
        .number()
        .int()
        .min(1950, 'Ano inválido')
        .max(new Date().getFullYear() + 1),
    )
    .optional()
    .nullable(),
  capacity_ton: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(z.number().positive('Capacidade deve ser positiva').max(100, 'Capacidade excessiva'))
    .optional()
    .nullable(),
  current_odometer: z.coerce.number().int().min(0).optional().nullable(),
})

export const driverSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  cpf: z.string().refine(isValidCPF, { message: 'CPF inválido' }).optional().or(z.literal('')),
  phone: z
    .string()
    .refine(isValidPhone, { message: 'Telefone inválido' })
    .optional()
    .or(z.literal('')),
  monthly_salary: z.coerce
    .number()
    .positive('Salário deve ser positivo')
    .max(100000, 'Salário excessivo'),
  truck_id: z
    .union([z.literal(''), z.string()])
    .transform((val) => (val === '' ? null : z.coerce.number().parse(val)))
    .optional()
    .nullable(),
})

export const routeSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  distance_km: z.number().positive('Distância deve ser positiva').max(10000, 'Distância excessiva'),
})

export const tripSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data em formato inválido'),
  truck_id: z.coerce.number().int().positive(),
  driver_id: z.coerce.number().int().positive(),
  product_id: z.coerce.number().int().positive(),
  customer_id: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(z.number().int().positive())
    .optional()
    .nullable(),
  route_id: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(z.number().int().positive())
    .optional()
    .nullable(),
  supplier_id: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(z.number().int().positive())
    .optional()
    .nullable(),
  weight_ton: z.coerce.number().positive('Peso deve ser positivo').max(100, 'Peso excessivo'),
  price_charged: z.coerce
    .number()
    .positive('Valor deve ser positivo')
    .max(1000000, 'Valor excessivo'),
  km_driven: z.coerce.number().positive('KM deve ser positivo').max(10000, 'KM excessivo'),
  observation: z.string().max(500).optional(),
})

export const costSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data em formato inválido'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  value: z.coerce.number().positive('Valor deve ser positivo').max(1000000, 'Valor excessivo'),
  truck_id: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(z.number().int().positive())
    .optional()
    .nullable(),
  supplier_id: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(z.number().int().positive())
    .optional()
    .nullable(),
  driver_id: z
    .union([z.literal(''), z.coerce.number()])
    .transform((val) => (val === '' ? null : val))
    .pipe(z.number().int().positive())
    .optional()
    .nullable(),
  description: z.string().max(255).optional(),
})

export const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória.'),
})
