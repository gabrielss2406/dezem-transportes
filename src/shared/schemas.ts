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
  unit_value: optionalNumber(1000000, 'Valor máximo de R$ 1.000.000'),
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
  model: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().max(50).optional().nullable(),
  ),
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
  commission_rate_override: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().min(0).max(100, 'Máximo de 100%').nullable().optional(),
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

export const fuelRecordSchema = z.object({
  truck_id: requiredNumber(999999999, 'ID inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  liters: optionalNumber(10000, 'Máximo de 10.000 litros'),
  value: requiredNumber(1000000, 'Valor máximo de R$ 1.000.000'),
  odometer_at_service: requiredNumber(9999999, 'KM máximo de 9.999.999'),
  supplier_id: optionalNumber(999999999, 'ID inválido'),
  notes: z.string().max(500).optional(),
})

export const tripSchema = z.object({
  ticket_number: z
    .string()
    .trim()
    .min(1, 'Número do bilhete é obrigatório')
    .max(100, 'Número do bilhete muito longo'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  truck_id: requiredNumber(999999999, 'ID inválido'),
  driver_id: requiredNumber(999999999, 'ID inválido'),
  product_id: requiredNumber(999999999, 'ID inválido'),
  customer_id: optionalNumber(999999999, 'ID inválido'),
  supplier_id: optionalNumber(999999999, 'ID inválido'), // Keep for backward compatibility or main supplier
  weight_ton: requiredNumber(999999, 'Peso máximo de 999.999 toneladas'),
  overweight_ton: optionalNumber(999999, 'Excesso máximo de 999.999 toneladas'),
  overweight_observation: z.string().max(500).optional().nullable(),
  price_charged: requiredNumber(1000000, 'Valor máximo de R$ 1.000.000'),
  // No longer collected in the trip entry form; defaults to 0 for new trips
  // and is preserved unchanged for existing trips edited through the form.
  km_driven: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0).max(10000, 'KM máximo de 10.000'),
  ),
  observation: z.string().max(500).optional(),
  has_percentage_tax: z.boolean().optional(),
  has_commission: z.boolean().optional(),
  is_third_party: z.boolean().optional(),
  third_party_contractor_id: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable().optional(),
  ),
  fuel_stops: z.array(fuelStopSchema).optional(),
})

export const maintenanceTypeSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  description: z.string().max(255).optional(),
  // Whether services of this type advance the mileage-based maintenance interval
  // (oil change, tire rotation). Informational types (side mirror, lights, body
  // repair) leave this at 0 and don't require an odometer reading.
  tracks_mileage: z.preprocess(
    (val) => (val === false || val === 0 || val === '0' ? 0 : 1),
    z.number().int(),
  ),
  // Only meaningful when tracks_mileage = 1; the handler enforces it as required there.
  interval_km: optionalNumber(999999, 'KM máximo de 999.999'),
  is_active: z.preprocess(
    (val) => (val === true || val === 1 || val === '1' ? 1 : 0),
    z.number().int(),
  ),
})

export const maintenanceRecordSchema = z.object({
  truck_id: requiredNumber(999999999, 'ID inválido'),
  maintenance_type_id: requiredNumber(999999999, 'ID inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  // Optional at the schema level: required only for mileage-tracking types, and
  // validated against the truck's current odometer — both enforced in the handler.
  odometer_at_service: optionalNumber(9999999, 'KM máximo de 9.999.999'),
  notes: z.string().max(500).optional(),
})

export const costSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  category: z.string().min(1, 'Selecione uma categoria'),
  value: requiredNumber(1000000, 'Valor máximo de R$ 1.000.000'), // "valor total" quando installments > 1
  truck_id: optionalNumber(999999999, 'ID inválido'),
  supplier_id: optionalNumber(999999999, 'ID inválido'),
  driver_id: optionalNumber(999999999, 'ID inválido'),
  description: z.string().max(255).optional(),
  installments: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 1 : Number(val)),
    z.number().int().min(1, 'Mínimo de 1 parcela').max(360, 'Máximo de 360 parcelas'),
  ),
  kind: z.enum(['operational', 'expense']).default('operational'),
})

export const receivablesMarkPaidSchema = z.object({
  ids: z.array(idSchema).min(1, 'Selecione ao menos um item'),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
})

export const costsMarkPaidSchema = z.object({
  ids: z.array(idSchema).min(1, 'Selecione ao menos um item'),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
})

export const thirdPartySettlementsMarkSettledSchema = z.object({
  ids: z.array(idSchema).min(1, 'Selecione ao menos um item'),
  settled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
})

export const receivableSchema = z.object({
  customer_id: optionalNumber(999999999, 'ID inválido'),
  amount: requiredNumber(10000000, 'Valor máximo de R$ 10.000.000'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  description: z.string().max(255).optional(),
  kind: z.enum(['revenue', 'adjustment']).default('revenue'),
})

export const customerPriceSchema = z.object({
  customerId: idSchema,
  productId: idSchema,
  price: requiredNumber(10000000, 'Valor máximo de R$ 10.000.000'),
})

export const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const appSettingsSchema = z.object({
  taxRate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0).max(100, 'Máximo de 100%'),
  ),
  commissionRate: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0).max(100, 'Máximo de 100%'),
  ),
})

export const backupConfigSchema = z.object({
  endpoint: z.string().url('Endpoint deve ser uma URL válida'),
  bucket: z.string().min(3, 'Nome do bucket é obrigatório'),
  accessKeyId: z.string().min(1, 'Access Key ID é obrigatório'),
  secretAccessKey: z.string().min(1, 'Secret Access Key é obrigatório'),
})
