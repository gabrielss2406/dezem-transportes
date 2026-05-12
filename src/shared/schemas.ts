import { z } from 'zod'
export { z }
import { isValidCNPJ, isValidCPF, isValidPhone } from './validation'

// Configuração global de mensagens em Português
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined') {
      return { message: 'Obrigatório' }
    }
    return { message: 'Valor inválido' }
  }
  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === 'string') {
      return { message: `Mínimo de ${issue.minimum} caracteres` }
    }
    return { message: `Valor mínimo é ${issue.minimum}` }
  }
  if (issue.code === z.ZodIssueCode.too_big) {
    if (issue.type === 'string') {
      return { message: `Máximo de ${issue.maximum} caracteres` }
    }
    return { message: `Valor máximo permitido é ${issue.maximum}` }
  }
  if (issue.code === z.ZodIssueCode.invalid_string) {
    if (issue.validation === 'email') {
      return { message: 'E-mail inválido' }
    }
    return { message: 'Formato inválido' }
  }
  if (issue.code === z.ZodIssueCode.custom) {
    return { message: issue.message || 'Valor inválido' }
  }
  return { message: ctx.defaultError }
})

// Auxiliar para campos numéricos opcionais vindo de inputs de texto
const optionalNumber = (max: number, maxMsg: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive('Deve ser positivo').max(max, maxMsg).nullable(),
  )

const requiredNumber = (max: number, maxMsg: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ required_error: 'Obrigatório' }).positive('Deve ser positivo').max(max, maxMsg),
  )

export const idSchema = z.number().int().positive()

export const waypointSchema = z.object({
  id: idSchema.optional(), // id is optional for new waypoints
  name: z.string().min(1, 'Nome do ponto de parada é obrigatório').max(100),
  sequence: z.number().int().min(0),
})

export const waypointsSchema = z.array(waypointSchema)

export const customerSchema = z.object({
  name: z.string().min(3).max(100),
  cnpj: z
    .string()
    .optional()
    .refine((val) => !val || isValidCNPJ(val), { message: 'CNPJ inválido' }),
  ie: z.string().max(20).optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidPhone(val), { message: 'Telefone inválido' }),
  address: z.string().max(255).optional(),
})

export const productSchema = z.object({
  name: z.string().min(2).max(100),
  unit: z.string().max(10).optional(),
})

export const supplierSchema = z.object({
  name: z.string().min(3).max(100),
  type: z.string().max(50).optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidPhone(val), { message: 'Telefone inválido' }),
})

export const truckSchema = z.object({
  license_plate: z
    .string()
    .length(7, 'Placa deve ter 7 caracteres')
    .regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Placa inválida (use ABC1D23 ou ABC1234)'),
  model: z.string().min(2).max(50),
  year: z.preprocess(
    (val) => (val === '' || val === null ? null : Number(val)),
    z
      .number()
      .int()
      .min(1950, 'Ano inválido')
      .max(new Date().getFullYear() + 1, 'Ano inválido')
      .nullable(),
  ),
  capacity_ton: optionalNumber(200, 'Capacidade máxima de 200 toneladas'),
  current_odometer: z.preprocess(
    (val) => (val === '' || val === null ? 0 : Number(val)),
    z.number().min(0).max(9999999, 'Limite de 9.999.999 km'),
  ),
})

export const driverSchema = z.object({
  name: z.string().min(3).max(100),
  cpf: z
    .string()
    .optional()
    .refine((val) => !val || isValidCPF(val), { message: 'CPF inválido' }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidPhone(val), { message: 'Telefone inválido' }),
  monthly_salary: requiredNumber(1000000, 'Salário máximo de R$ 1.000.000'),
  truck_id: z.preprocess(
    (val) => (val === '' || val === null ? null : Number(val)),
    z.number().int().positive().nullable(),
  ),
})

export const routeSchema = z.object({
  name: z.string().min(3).max(100),
  distance_km: requiredNumber(100000, 'Distância máxima de 100.000 km'),
  customer_id: optionalNumber(999999999, 'ID inválido'),
})

export const fuelStopSchema = z.object({
  supplier_id: requiredNumber(999999999, 'ID inválido'),
  value: requiredNumber(1000000, 'Valor máximo de R$ 1.000.000'),
  liters: requiredNumber(10000, 'Máximo de 10.000 litros'),
  km_driven: optionalNumber(10000, 'KM máximo de 10.000'),
})

export const tripSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  truck_id: requiredNumber(999999999, 'ID inválido'),
  driver_id: requiredNumber(999999999, 'ID inválido'),
  product_id: requiredNumber(999999999, 'ID inválido'),
  customer_id: optionalNumber(999999999, 'ID inválido'),
  route_id: optionalNumber(999999999, 'ID inválido'),
  supplier_id: optionalNumber(999999999, 'ID inválido'), // Keep for backward compatibility or main supplier
  weight_ton: requiredNumber(100, 'Peso máximo de 100 toneladas'),
  price_charged: requiredNumber(1000000, 'Valor máximo de R$ 1.000.000'),
  km_driven: requiredNumber(10000, 'KM máximo de 10.000'),
  observation: z.string().max(500).optional(),
  fuel_stops: z.array(fuelStopSchema).optional(),
})

export const costSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  category: z.string().min(1, 'Selecione uma categoria'),
  value: requiredNumber(1000000, 'Valor máximo de R$ 1.000.000'),
  truck_id: optionalNumber(999999999, 'ID inválido'),
  supplier_id: optionalNumber(999999999, 'ID inválido'),
  driver_id: optionalNumber(999999999, 'ID inválido'),
  description: z.string().max(255).optional(),
})

export const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
})
