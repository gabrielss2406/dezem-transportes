import { z } from 'zod'
export { z }
import { isValidCNPJ, isValidCPF, isValidPhone } from './validation'

// Auxiliar para campos numéricos opcionais vindo de inputs de texto
const optionalNumber = (max: number, maxMsg: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive('Deve ser positivo').max(max, maxMsg).nullable(),
  )

const requiredNumber = (max: number, maxMsg: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().positive('Deve ser positivo').max(max, maxMsg),
  )

export const idSchema = z.number().int().positive()

export const contractorSchema = z.object({
  name: z.string().min(3).max(100),
  cnpj: z
    .string()
    .optional()
    .refine((val) => !val || isValidCNPJ(val), { message: 'CNPJ inválido' }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidPhone(val), { message: 'Telefone inválido' }),
})

export const customerSchema = z.object({
  customId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().positive().optional(),
  ),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
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
  customId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().positive().optional(),
  ),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  unit: z.string().max(10).optional(),
})

export const supplierSchema = z.object({
  customId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().positive().optional(),
  ),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  type: z.string().max(50).optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidPhone(val), { message: 'Telefone inválido' }),
})

export const truckSchema = z.object({
  customId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().positive().optional(),
  ),
  license_plate: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase().replace(/-/g, '') : val),
    z
      .string()
      .length(7, 'Placa deve ter 7 caracteres')
      .regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Placa inválida (use ABC1D23 ou ABC-1234)'),
  ),
  model: z.string().min(2, 'Modelo deve ter pelo menos 2 caracteres').max(50),
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
  is_outsourced: z.preprocess(
    (val) => (val === true || val === 1 || val === '1' ? 1 : 0),
    z.number().int().optional(),
  ),
  contractor_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable().optional(),
  ),
})

export const driverSchema = z.object({
  customId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().positive().optional(),
  ),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  cpf: z
    .string()
    .optional()
    .refine((val) => !val || isValidCPF(val), { message: 'CPF inválido' }),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidPhone(val), { message: 'Telefone inválido' }),
  monthly_salary: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0).max(1000000, 'Salário máximo de R$ 1.000.000'),
  ),
  truck_id: z.preprocess(
    (val) => (val === '' || val === null ? null : Number(val)),
    z.number().int().positive().nullable(),
  ),
  is_outsourced: z.preprocess(
    (val) => (val === true || val === 1 || val === '1' ? 1 : 0),
    z.number().int().optional(),
  ),
  contractor_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable().optional(),
  ),
})

export const routeSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  distance_km: requiredNumber(100000, 'Distância máxima de 100.000 km'),
  customer_id: optionalNumber(999999999, 'ID inválido'),
})

export const fuelStopSchema = z.object({
  supplier_id: requiredNumber(999999999, 'ID inválido'),
  value: requiredNumber(1000000, 'Valor máximo de R$ 1.000.000'),
  liters: optionalNumber(10000, 'Máximo de 10.000 litros'),
  km_driven: optionalNumber(10000, 'KM máximo de 10.000'),
})

export const tripSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  truck_id: requiredNumber(999999999, 'ID inválido'),
  driver_id: requiredNumber(999999999, 'ID inválido'),
  product_id: requiredNumber(999999999, 'ID inválido'),
  customer_id: optionalNumber(999999999, 'ID inválido'),
  supplier_id: optionalNumber(999999999, 'ID inválido'), // Keep for backward compatibility or main supplier
  weight_ton: requiredNumber(100, 'Peso máximo de 100 toneladas'),
  overweight_ton: optionalNumber(100, 'Excesso máximo de 100 toneladas'),
  overweight_observation: z.string().max(500).optional().nullable(),
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

export const customerPriceSchema = z.object({
  customerId: idSchema,
  productId: idSchema,
  price: requiredNumber(10000000, 'Valor máximo de R$ 10.000.000'),
})

export const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const backupConfigSchema = z.object({
  endpoint: z.string().url('Endpoint deve ser uma URL válida'),
  bucket: z.string().min(3, 'Nome do bucket é obrigatório'),
  accessKeyId: z.string().min(1, 'Access Key ID é obrigatório'),
  secretAccessKey: z.string().min(1, 'Secret Access Key é obrigatório'),
})
