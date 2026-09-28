import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { getInitialSalaryLaunchDate, getNextSalaryDriverId } from '../../../shared/salary'
import { costSchema, fuelRecordSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import { PeriodShortcuts } from '../components/PeriodShortcuts'
import {
  Button,
  ConfirmModal,
  CurrencyInput,
  DatePicker,
  Input,
  Modal,
  MonthNavigator,
  Select,
  type SelectRef,
  Toast,
  useToast,
} from '../components/ui'
import { generatePdf } from '../lib/pdfGenerator'
import type {
  CommissionByDriver,
  Cost,
  CreditorReportLine,
  Customer,
  Driver,
  FuelRecord,
  OilCreditEntry,
  OilCreditMovement,
  OilCreditSummary,
  SalarySummary,
  Supplier,
  Truck,
} from '../lib/types'
import {
  currentMonthKey,
  currentMonthRange,
  formatBRL,
  formatDate,
  monthRangeFromKey,
  today,
} from '../lib/utils'

interface CostFormData {
  date: string
  category: string
  value: number
  truck_id: number | null
  supplier_id: number | null
  driver_id: number | null
  description?: string
  installments: number
  kind: 'operational' | 'expense'
}

interface FuelFormData {
  truck_id: number
  date: string
  liters: number | null
  value: number
  odometer_at_service: number
  supplier_id: number | null
  notes?: string
  credit_mode: 'normal' | 'credit'
  credit_customer_id: number | null
  voucher_number?: string
  allow_expired_credit?: boolean
}

const EMPTY_COST: CostFormData = {
  date: today(),
  category: '',
  value: 0,
  truck_id: null,
  supplier_id: null,
  driver_id: null,
  description: '',
  installments: 1,
  kind: 'operational',
}

const EMPTY_FUEL: FuelFormData = {
  truck_id: 0,
  date: today(),
  liters: null,
  value: 0,
  odometer_at_service: 0,
  supplier_id: null,
  notes: '',
  credit_mode: 'normal',
  credit_customer_id: null,
  voucher_number: '',
  allow_expired_credit: false,
}

const categoryBadge: Record<string, string> = {
  fuel: 'bg-secondary-container text-on-secondary-container',
  oil: 'bg-secondary-container text-on-secondary-container',
  maintenance: 'bg-tertiary-container/30 text-tertiary',
  salary: 'bg-primary/10 text-primary',
  toll: 'bg-surface-container-highest text-on-surface-variant',
  others: 'bg-surface-container-highest text-on-surface-variant',
}

function oneMonthFrom(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number)
  const targetMonthIndex = month
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedMonthIndex = targetMonthIndex % 12
  const lastDay = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate()
  const clampedDay = Math.min(day, lastDay)
  return `${targetYear}-${String(normalizedMonthIndex + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

export function CostsPage() {
  const [activeTab, setActiveTab] = useState<
    'costs' | 'fuel' | 'commissions' | 'creditor' | 'oil-credits'
  >('costs')

  // ── Commissions state ──
  const [commissionData, setCommissionData] = useState<CommissionByDriver[]>([])
  const [commissionDateFilters, setCommissionDateFilters] = useState({
    ...currentMonthRange(),
    driver_id: '',
  })

  // ── Creditor report state ──
  const [creditorReport, setCreditorReport] = useState<CreditorReportLine[]>([])
  const [creditorSupplierFilter, setCreditorSupplierFilter] = useState('')
  const [creditorMonth, setCreditorMonth] = useState(currentMonthKey())
  const [creditorFilterMode, setCreditorFilterMode] = useState<'month' | 'range'>('month')
  const [creditorRangeStart, setCreditorRangeStart] = useState(today())
  const [creditorRangeEnd, setCreditorRangeEnd] = useState(today())

  // ── Costs state ──
  const [costs, setCosts] = useState<Cost[]>([])
  const [costCategories, setCostCategories] = useState<{ value: string; label: string }[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSupplierId, setFilterSupplierId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [costMonth, setCostMonth] = useState(currentMonthKey())
  const [costFilterMode, setCostFilterMode] = useState<'month' | 'range'>('month')
  const [costRangeStart, setCostRangeStart] = useState(today())
  const [costRangeEnd, setCostRangeEnd] = useState(today())
  const [costModal, setCostModal] = useState(false)
  const [editingCost, setEditingCost] = useState<Cost | null>(null)
  const [pendingCost, setPendingCost] = useState<any>(null)
  const [deleteCostTarget, setDeleteCostTarget] = useState<Cost | null>(null)
  const [showCostDiscardConfirm, setShowCostDiscardConfirm] = useState(false)
  const [markPaidTarget, setMarkPaidTarget] = useState<Cost | null>(null)
  const [markPaidDate, setMarkPaidDate] = useState(today())
  const [salaryModal, setSalaryModal] = useState(false)
  const [salaryMonth, setSalaryMonth] = useState(currentMonthKey())
  const [salaryDate, setSalaryDate] = useState(getInitialSalaryLaunchDate())
  const [salarySearch, setSalarySearch] = useState('')
  const [salarySummary, setSalarySummary] = useState<SalarySummary[]>([])
  const [salaryValues, setSalaryValues] = useState<Record<number, number>>({})
  const [salaryLoading, setSalaryLoading] = useState(false)

  // ── Fuel state ──
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [fuelTruckFilter, setFuelTruckFilter] = useState('')
  const [fuelMonth, setFuelMonth] = useState(currentMonthKey())
  const [fuelModal, setFuelModal] = useState(false)
  const [pendingFuel, setPendingFuel] = useState<any>(null)
  const [deleteFuelTarget, setDeleteFuelTarget] = useState<FuelRecord | null>(null)
  const [showFuelDiscardConfirm, setShowFuelDiscardConfirm] = useState(false)
  const [fuelCreditBalance, setFuelCreditBalance] = useState({ active: 0, expired: 0 })

  // ── Oil credit state ──
  const [oilCredits, setOilCredits] = useState<OilCreditEntry[]>([])
  const [oilCreditMovements, setOilCreditMovements] = useState<OilCreditMovement[]>([])
  const [oilCreditSummary, setOilCreditSummary] = useState<OilCreditSummary | null>(null)
  const [oilCreditCustomerFilter, setOilCreditCustomerFilter] = useState('')
  const [oilCreditModal, setOilCreditModal] = useState(false)
  const [deleteOilCreditTarget, setDeleteOilCreditTarget] = useState<OilCreditEntry | null>(null)
  const [editingOilCredit, setEditingOilCredit] = useState<OilCreditEntry | null>(null)
  const [oilCreditForm, setOilCreditForm] = useState({
    customer_id: '',
    amount: 0,
    issued_date: today(),
    expires_at: oneMonthFrom(today()),
    description: '',
  })

  // ── Shared state ──
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const { toast, show } = useToast()

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.state?.activeTab === 'oil-credits') {
      setActiveTab('oil-credits')
    }
    if (location.state?.openModal) {
      setCostModal(true)
    }
    if (location.state?.activeTab || location.state?.openModal) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  // ── Cost form ──
  const categorySelectRef = useRef<SelectRef>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)
  const installmentsRef = useRef<HTMLInputElement>(null)
  const truckSelectRef = useRef<SelectRef>(null)
  const supplierSelectRef = useRef<SelectRef>(null)
  const driverSelectRef = useRef<SelectRef>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const firstSalaryValueRef = useRef<HTMLInputElement>(null)
  const salaryValueRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [isInstallment, setIsInstallment] = useState(false)

  const {
    handleSubmit: handleCostSubmit,
    formState: { errors: costErrors, isDirty: isCostDirty },
    reset: resetCost,
    control: costControl,
    setValue: setCostValue,
  } = useForm<CostFormData>({
    resolver: zodResolver(costSchema) as any,
    defaultValues: { ...EMPTY_COST },
    mode: 'all',
  })

  // ── Fuel form ──
  const fuelTruckSelectRef = useRef<SelectRef>(null)
  const fuelDateRef = useRef<HTMLInputElement>(null)
  const fuelOdometerRef = useRef<HTMLInputElement>(null)
  const fuelLitersRef = useRef<HTMLInputElement>(null)
  const fuelValueRef = useRef<HTMLInputElement>(null)
  const fuelSupplierSelectRef = useRef<SelectRef>(null)
  const fuelNotesRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit: handleFuelSubmit,
    formState: { errors: fuelErrors, isDirty: isFuelDirty },
    reset: resetFuel,
    control: fuelControl,
    watch: watchFuel,
    setError: setFuelError,
  } = useForm<FuelFormData>({
    resolver: zodResolver(fuelRecordSchema) as any,
    defaultValues: { ...EMPTY_FUEL },
    mode: 'all',
  })

  const selectedFuelTruckId = watchFuel('truck_id')
  const selectedFuelCreditMode = watchFuel('credit_mode')
  const selectedFuelCreditCustomerId = watchFuel('credit_customer_id')
  const selectedTruck = trucks.find((t) => String(t.id) === String(selectedFuelTruckId))

  const gasStations = suppliers.filter((s) => s.type === 'gas_station')

  const load = useCallback(async () => {
    const [cc, tr, s, d, c] = await Promise.all([
      window.api['cost-categories'].list(),
      window.api.trucks.list(),
      window.api.suppliers.list(),
      window.api.drivers.list(),
      window.api.customers.list(),
    ])
    setCostCategories(cc)
    setTrucks(tr)
    setSuppliers(s)
    setDrivers(d)
    setCustomers(c)
  }, [])

  const loadCosts = useCallback(async () => {
    const { start, end } =
      costFilterMode === 'month'
        ? monthRangeFromKey(costMonth)
        : { start: costRangeStart, end: costRangeEnd }
    const c = await window.api.costs.list({
      startDate: start,
      endDate: end,
      supplier_id: filterSupplierId || undefined,
      status: filterStatus || undefined,
    })
    setCosts(c)
  }, [costMonth, filterSupplierId, filterStatus, costFilterMode, costRangeStart, costRangeEnd])

  useEffect(() => {
    if (!salaryModal) {
      return
    }
    const { start, end } = monthRangeFromKey(salaryMonth)
    setSalaryLoading(true)
    window.api.costs
      .salarySummary(start, end)
      .then((summary) => {
        setSalarySummary(summary)
        setSalaryValues(Object.fromEntries(summary.map((driver) => [driver.id, 0])))
        window.setTimeout(() => firstSalaryValueRef.current?.focus(), 0)
      })
      .finally(() => setSalaryLoading(false))
  }, [salaryModal, salaryMonth])

  const loadFuel = useCallback(async () => {
    const { start, end } = monthRangeFromKey(fuelMonth)
    const f = await window.api.fuel.list({
      truck_id: fuelTruckFilter || undefined,
      startDate: start,
      endDate: end,
    })
    setFuelRecords(f)
  }, [fuelMonth, fuelTruckFilter])

  const loadOilCredits = useCallback(async () => {
    const [entries, summary, movements] = await Promise.all([
      window.api.oilCredits.list({
        customer_id: oilCreditCustomerFilter || undefined,
      }),
      window.api.oilCredits.summary(),
      window.api.oilCredits.movements({
        customer_id: oilCreditCustomerFilter || undefined,
      }),
    ])
    setOilCredits(entries)
    setOilCreditSummary(summary)
    setOilCreditMovements(movements)
  }, [oilCreditCustomerFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadCosts()
  }, [loadCosts])

  useEffect(() => {
    loadFuel()
  }, [loadFuel])

  useEffect(() => {
    loadOilCredits()
  }, [loadOilCredits])

  const loadCommissions = useCallback(async () => {
    const c = await window.api.dashboard.commissionByDriver(
      commissionDateFilters.start,
      commissionDateFilters.end,
      commissionDateFilters.driver_id || undefined,
    )
    setCommissionData(c)
  }, [commissionDateFilters])

  useEffect(() => {
    loadCommissions()
  }, [loadCommissions])

  const loadCreditorReport = useCallback(async () => {
    const { start, end } =
      creditorFilterMode === 'month'
        ? monthRangeFromKey(creditorMonth)
        : { start: creditorRangeStart, end: creditorRangeEnd }
    const r = await window.api.costs.byCreditor({
      startDate: start,
      endDate: end,
      supplier_id: creditorSupplierFilter || undefined,
    })
    setCreditorReport(r)
  }, [
    creditorFilterMode,
    creditorMonth,
    creditorRangeStart,
    creditorRangeEnd,
    creditorSupplierFilter,
  ])

  useEffect(() => {
    loadCreditorReport()
  }, [loadCreditorReport])

  // ── Cost modal lifecycle ──
  useEffect(() => {
    if (costModal) {
      if (!editingCost) {
        setTimeout(() => {
          window.focus()
          categorySelectRef.current?.open()
        }, 200)
      }
    } else {
      resetCost(EMPTY_COST)
      setIsInstallment(false)
      setEditingCost(null)
    }
  }, [costModal, editingCost, resetCost])

  // ── Fuel modal lifecycle ──
  useEffect(() => {
    if (fuelModal) {
      setTimeout(() => {
        window.focus()
        fuelTruckSelectRef.current?.open()
      }, 200)
    } else {
      resetFuel(EMPTY_FUEL)
    }
  }, [fuelModal, resetFuel])

  useEffect(() => {
    if (selectedFuelCreditMode !== 'credit' || !selectedFuelCreditCustomerId) {
      setFuelCreditBalance({ active: 0, expired: 0 })
      return
    }
    window.api.oilCredits.list({ customer_id: selectedFuelCreditCustomerId }).then((entries) => {
      setFuelCreditBalance({
        active: entries
          .filter((entry) => entry.status === 'active')
          .reduce((total, entry) => total + Number(entry.available_amount || 0), 0),
        expired: entries
          .filter((entry) => entry.status === 'expired')
          .reduce((total, entry) => total + Number(entry.available_amount || 0), 0),
      })
    })
  }, [selectedFuelCreditCustomerId, selectedFuelCreditMode])

  // ── Cost handlers ──
  const saveCost = async (data: CostFormData) => {
    try {
      if (editingCost) {
        await window.api.costs.update(editingCost.id, data as any)
        show('Custo atualizado!')
      } else {
        await window.api.costs.create(data as any)
        show('Custo lançado!')
      }
      setCostModal(false)
      setPendingCost(null)
      loadCosts()
    } catch (e: any) {
      setPendingCost(null)
      show(e.message || 'Erro ao salvar custo', 'error')
    }
  }

  const onCostSubmit = (data: CostFormData) => saveCost(data)
  const onCostEnterSubmit = (data: CostFormData) => setPendingCost(data)

  const openEditCost = (row: Cost) => {
    setEditingCost(row)
    resetCost({
      date: row.date,
      category: row.category,
      value: row.value,
      truck_id: row.truck_id ?? null,
      supplier_id: row.supplier_id ?? null,
      driver_id: row.driver_id ?? null,
      description: row.description ?? '',
      installments: 1,
      kind: row.kind,
    })
    setIsInstallment(false)
    window.focus()
    setCostModal(true)
  }

  const handleMarkCostPaid = async () => {
    if (!markPaidTarget) {
      return
    }
    const result = await window.api.costs.markPaid({
      ids: [markPaidTarget.id],
      paid_date: markPaidDate,
    })
    if (result?.ok === false) {
      show('Erro ao dar baixa', 'error')
      return
    }
    show('Parcela baixada!')
    setMarkPaidTarget(null)
    setMarkPaidDate(today())
    loadCosts()
  }

  const handleDeleteCost = async () => {
    if (!deleteCostTarget) {
      return
    }
    await window.api.costs.delete(deleteCostTarget.id)
    show('Custo excluído')
    setDeleteCostTarget(null)
    loadCosts()
  }

  const handleExportCostsPdf = async () => {
    const subtitleParts: string[] = []
    const fileNameParts: string[] = []

    if (costFilterMode === 'month') {
      subtitleParts.push(`Mês: ${costMonth}`)
      fileNameParts.push(costMonth)
    } else {
      subtitleParts.push(`Período: ${formatDate(costRangeStart)} a ${formatDate(costRangeEnd)}`)
      fileNameParts.push(`${costRangeStart}_a_${costRangeEnd}`)
    }
    if (filterSupplierId) {
      const supplier = suppliers.find((s) => String(s.id) === String(filterSupplierId))
      if (supplier) {
        subtitleParts.push(`Fornecedor: ${supplier.name}`)
        fileNameParts.push(supplier.name)
      }
    } else {
      subtitleParts.push('Fornecedor: Todos')
    }
    if (filterStatus) {
      subtitleParts.push(`Status: ${filterStatus === 'paid' ? 'Pago' : 'Em aberto'}`)
    }

    const safeFileName = fileNameParts
      .join('_')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w-]/g, '')

    const fileName = safeFileName ? `contas_a_pagar_${safeFileName}` : 'contas_a_pagar'

    const headers = ['Data', 'Descrição', 'Categoria', 'Fornecedor', 'Valor', 'Status']
    const data = filteredCosts.map((row) => {
      const cat = costCategories.find((c) => c.value === row.category)
      return [
        formatDate(row.date),
        row.description || '—',
        cat?.label ?? row.category,
        row.supplier_name ?? '—',
        formatBRL(row.value),
        row.status === 'paid' ? 'Pago' : 'Em aberto',
      ]
    })
    const total = filteredCosts.reduce((s, c) => s + c.value, 0)
    const foot = [['TOTAL', '', '', '', formatBRL(total), '']]

    const pdfData = generatePdf({
      title: 'Contas a Pagar',
      subtitle: subtitleParts.join(' | '),
      headers,
      data,
      foot,
    })

    try {
      const result = await window.api.exportPdf({ fileName, data: pdfData })
      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  const handleExportCreditorPdf = async () => {
    const subtitleParts: string[] = []
    const fileNameParts: string[] = []

    if (creditorFilterMode === 'month') {
      subtitleParts.push(`Mês: ${creditorMonth}`)
      fileNameParts.push(creditorMonth)
    } else {
      subtitleParts.push(
        `Período: ${formatDate(creditorRangeStart)} a ${formatDate(creditorRangeEnd)}`,
      )
      fileNameParts.push(`${creditorRangeStart}_a_${creditorRangeEnd}`)
    }
    if (creditorSupplierFilter) {
      const supplier = suppliers.find((s) => String(s.id) === String(creditorSupplierFilter))
      if (supplier) {
        subtitleParts.push(`Credor: ${supplier.name}`)
        fileNameParts.push(supplier.name)
      }
    } else {
      subtitleParts.push('Credor: Todos')
    }

    const safeFileName = fileNameParts
      .join('_')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w-]/g, '')

    const fileName = safeFileName
      ? `contas_a_pagar_por_credor_${safeFileName}`
      : 'contas_a_pagar_por_credor'

    const headers = [
      'Data',
      'Fornecedor',
      'Plano de Contas',
      'Descrição',
      'Bruto',
      'Crédito',
      'Líquido',
    ]
    const data: (string | number)[][] = []
    for (const group of creditorGroups) {
      const lines = creditorReport.filter((l) => l.supplier_id === group.supplier_id)
      for (const line of lines) {
        const cat = costCategories.find((c) => c.value === line.category)
        data.push([
          formatDate(line.date),
          line.supplier_name,
          cat?.label ?? line.category,
          line.description,
          formatBRL(line.gross_value ?? line.value),
          formatBRL(line.credit_value ?? 0),
          formatBRL(line.value),
        ])
      }
      data.push(['', '', '', `SUBTOTAL — ${group.supplier_name}`, '', '', formatBRL(group.total)])
    }
    const foot = [['', '', '', 'TOTAL GERAL', '', '', formatBRL(creditorGrandTotal)]]

    const pdfData = generatePdf({
      title: 'Contas a Pagar por Credor',
      subtitle: subtitleParts.join(' | '),
      headers,
      data,
      foot,
    })

    try {
      const result = await window.api.exportPdf({ fileName, data: pdfData })
      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  const handleCostEscape = () => {
    if (isCostDirty) {
      setShowCostDiscardConfirm(true)
    } else {
      setCostModal(false)
    }
  }

  const handleExportOilCreditsPdf = async () => {
    const data = oilCreditMovements.map((movement) => [
      formatDate(movement.date),
      movement.type === 'entry' ? 'Entrada' : 'Consumo',
      movement.customer_name,
      movement.type === 'entry'
        ? formatBRL(movement.gross_amount)
        : formatBRL(movement.credit_amount),
      movement.voucher_number || '—',
      movement.description || '—',
    ])
    const pdfData = generatePdf({
      title: 'Movimentação de Créditos de Óleo',
      subtitle: oilCreditCustomerFilter ? 'Cliente filtrado' : 'Todos os clientes',
      headers: ['Data', 'Tipo', 'Cliente', 'Valor', 'Vale', 'Descrição'],
      data,
      foot: [['', '', 'TOTAL DE MOVIMENTAÇÕES', String(oilCreditMovements.length), '', '']],
    })
    try {
      const result = await window.api.exportPdf({
        fileName: 'movimentacao_creditos_oleo',
        data: pdfData,
      })
      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  const handleExportFuelPdf = async () => {
    const truck = trucks.find((item) => String(item.id) === String(fuelTruckFilter))
    const data = fuelRecords.map((row) => [
      formatDate(row.date),
      row.truck_license_plate || '—',
      row.supplier_name || '—',
      row.liters != null ? `${Number(row.liters).toFixed(2)} L` : '—',
      formatBRL(row.gross_value ?? row.value),
      formatBRL(row.credit_value ?? 0),
      formatBRL(row.value),
      row.voucher_number || '—',
    ])
    const totalGross = fuelRecords.reduce(
      (sum, row) => sum + Number(row.gross_value ?? row.value),
      0,
    )
    const totalCredit = fuelRecords.reduce((sum, row) => sum + Number(row.credit_value ?? 0), 0)
    const totalNet = fuelRecords.reduce((sum, row) => sum + Number(row.value), 0)
    const pdfData = generatePdf({
      title: 'Relatório de Abastecimentos',
      subtitle: `Mês: ${fuelMonth} | Caminhão: ${truck?.license_plate || 'Todos'}`,
      headers: ['Data', 'Caminhão', 'Posto', 'Litros', 'Bruto', 'Crédito', 'Líquido', 'Vale'],
      data,
      foot: [
        [
          'TOTAL',
          '',
          '',
          '',
          formatBRL(totalGross),
          formatBRL(totalCredit),
          formatBRL(totalNet),
          '',
        ],
      ],
    })
    try {
      const result = await window.api.exportPdf({
        fileName: `abastecimentos_${fuelMonth}`,
        data: pdfData,
      })
      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  const handleExportCommissionPdf = async () => {
    const driver = drivers.find(
      (item) => String(item.id) === String(commissionDateFilters.driver_id),
    )
    const total = commissionData.reduce((sum, row) => sum + Number(row.total_commission), 0)
    const data = commissionData.map((row) => [
      row.name,
      String(row.trip_count),
      formatBRL(row.total_commission),
    ])
    const pdfData = generatePdf({
      title: 'Relatório de Comissões',
      subtitle: `Período: ${formatDate(commissionDateFilters.start)} a ${formatDate(commissionDateFilters.end)} | Motorista: ${driver?.name || 'Todos'}`,
      headers: ['Motorista', 'Viagens', 'Comissão'],
      data,
      foot: [['TOTAL', '', formatBRL(total)]],
    })
    try {
      const result = await window.api.exportPdf({ fileName: 'relatorio_comissoes', data: pdfData })
      if (result.success) {
        show(`PDF salvo e aberto com sucesso em: ${result.path}`, 'success')
      } else {
        show(`Erro ao exportar PDF: ${result.error}`, 'error')
      }
    } catch (error) {
      show('Ocorreu um erro inesperado ao exportar o PDF.', 'error')
      console.error(error)
    }
  }

  // ── Fuel handlers ──
  const saveFuel = async (data: FuelFormData) => {
    try {
      const result = await window.api.fuel.create(data as any)
      if (result?.ok === false) {
        setPendingFuel(null)
        if (result.errors?.odometer_at_service) {
          setFuelError('odometer_at_service', { message: result.errors.odometer_at_service })
          setFuelModal(true)
        } else {
          show(result.errors?.form || 'Erro ao registrar abastecimento', 'error')
        }
        return
      }
      show('Abastecimento registrado!')
      setFuelModal(false)
      setPendingFuel(null)
      loadFuel()
      load()
    } catch (e: any) {
      setPendingFuel(null)
      show(e.message || 'Erro ao registrar abastecimento', 'error')
    }
  }

  const onFuelSubmit = (data: FuelFormData) => saveFuel(data)
  const onFuelEnterSubmit = (data: FuelFormData) => setPendingFuel(data)

  const handleDeleteFuel = async () => {
    if (!deleteFuelTarget) {
      return
    }
    await window.api.fuel.delete(deleteFuelTarget.id)
    show('Abastecimento excluído')
    setDeleteFuelTarget(null)
    loadFuel()
    load()
  }

  const handleFuelEscape = () => {
    if (isFuelDirty) {
      setShowFuelDiscardConfirm(true)
    } else {
      setFuelModal(false)
    }
  }

  const saveOilCredit = async () => {
    const payload = {
      customer_id: oilCreditForm.customer_id,
      amount: oilCreditForm.amount,
      issued_date: oilCreditForm.issued_date,
      expires_at: oilCreditForm.expires_at,
      description: oilCreditForm.description,
    }
    const result = editingOilCredit
      ? await window.api.oilCredits.update(editingOilCredit.id, payload)
      : await window.api.oilCredits.create(payload)
    if (result.ok === false) {
      show(result.errors?.form || result.errors?.expires_at || 'Erro ao lançar crédito.', 'error')
      return
    }
    show(editingOilCredit ? 'Crédito atualizado!' : 'Crédito lançado!')
    setOilCreditModal(false)
    setEditingOilCredit(null)
    setOilCreditForm({
      customer_id: '',
      amount: 0,
      issued_date: today(),
      expires_at: oneMonthFrom(today()),
      description: '',
    })
    loadOilCredits()
  }

  const openEditOilCredit = (entry: OilCreditEntry) => {
    setEditingOilCredit(entry)
    setOilCreditForm({
      customer_id: String(entry.customer_id),
      amount: entry.amount,
      issued_date: entry.issued_date,
      expires_at: entry.expires_at,
      description: entry.description || '',
    })
    setOilCreditModal(true)
  }

  const deleteOilCredit = async (id: number) => {
    const result = await window.api.oilCredits.delete(id)
    if (result.ok === false) {
      show(result.errors?.form || 'Não foi possível excluir o crédito.', 'error')
      return
    }
    show('Crédito excluído!')
    loadOilCredits()
  }

  function openSalaryModal() {
    const selectedMonth = costMonth
    setSalaryMonth(selectedMonth)
    setSalaryDate(getInitialSalaryLaunchDate())
    setSalarySearch('')
    setSalarySummary([])
    setSalaryValues({})
    setSalaryModal(true)
  }

  function changeSalaryMonth(nextMonth: string) {
    setSalaryMonth(nextMonth)
    if (salaryDate.slice(0, 7) !== nextMonth) {
      setSalaryDate(monthRangeFromKey(nextMonth).start)
    }
  }

  async function issueSalaries() {
    if (salaryDate.slice(0, 7) !== salaryMonth) {
      show('A data deve pertencer ao mês selecionado.', 'error')
      return
    }
    const entries = salarySummary
      .map((driver) => ({
        driver_id: driver.id,
        value: Math.min(Number(salaryValues[driver.id] || 0), driver.remaining_salary),
      }))
      .filter((entry) => entry.value > 0)
    if (entries.length === 0) {
      show('Nenhum saldo restante para lançar.', 'error')
      return
    }
    const r = await window.api.costs.issueSalaries({ date: salaryDate, entries })
    if (r.ok) {
      show(`${r.issued} salário(s) lançado(s)!`)
      setSalaryModal(false)
      loadCosts()
    }
  }

  const filteredCosts = filterCategory ? costs.filter((c) => c.category === filterCategory) : costs
  const totalCosts = filteredCosts
    .filter((c) => c.category !== 'fuel')
    .reduce((s, c) => s + c.value, 0)
  const totalFuel = fuelRecords.reduce((s, f) => s + f.value, 0)
  const totalCommission = commissionData.reduce((s, c) => s + c.total_commission, 0)

  const creditorGroups = Array.from(
    creditorReport
      .reduce((map, line) => {
        const current = map.get(line.supplier_id) || {
          supplier_id: line.supplier_id,
          supplier_name: line.supplier_name,
          count: 0,
          total: 0,
        }
        current.count++
        current.total += line.value
        map.set(line.supplier_id, current)
        return map
      }, new Map<
        number,
        { supplier_id: number; supplier_name: string; count: number; total: number }
      >())
      .values(),
  ).sort((a, b) => b.total - a.total)
  const creditorGrandTotal = creditorReport.reduce((s, l) => s + l.value, 0)

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão Financeira"
        title="Custos da Frota"
        subtitle="Gerencie despesas operacionais e histórico de abastecimentos."
        secondaryActionLabel="Exportar PDF"
        onSecondaryAction={
          activeTab === 'creditor'
            ? handleExportCreditorPdf
            : activeTab === 'oil-credits'
              ? handleExportOilCreditsPdf
              : activeTab === 'fuel'
                ? handleExportFuelPdf
                : activeTab === 'commissions'
                  ? handleExportCommissionPdf
                  : handleExportCostsPdf
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-outline-variant/20">
        <button
          type="button"
          onClick={() => setActiveTab('costs')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'costs'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">receipt_long</span>
          Custos Operacionais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fuel')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'fuel'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">local_gas_station</span>
          Abastecimentos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('commissions')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'commissions'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">payments</span>
          Comissões
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('creditor')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'creditor'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">handshake</span>
          Por Credor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('oil-credits')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'oil-credits'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">account_balance</span>
          Crédito de Óleo
        </button>
      </div>

      {/* ── COSTS TAB ── */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-surface-container-low px-5 py-3 rounded-xl">
                <p className="text-xs text-on-surface-variant mb-0.5">Total do Período</p>
                <p className="text-2xl font-black font-headline text-primary">
                  {formatBRL(totalCosts)}
                </p>
              </div>
              <div className="flex gap-1 bg-surface-container-high rounded-lg p-1 border border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setCostFilterMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    costFilterMode === 'month'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Mês
                </button>
                <button
                  type="button"
                  onClick={() => setCostFilterMode('range')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    costFilterMode === 'range'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Período
                </button>
              </div>
              {costFilterMode === 'month' ? (
                <MonthNavigator monthKey={costMonth} onChange={setCostMonth} />
              ) : (
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={costRangeStart}
                    onChange={(e) => setCostRangeStart(e.target.value)}
                  />
                  <span className="text-on-surface-variant text-sm">a</span>
                  <DatePicker
                    value={costRangeEnd}
                    onChange={(e) => setCostRangeEnd(e.target.value)}
                  />
                  <PeriodShortcuts
                    monthKey={costMonth}
                    onMonthChange={setCostMonth}
                    onRangeChange={({ start, end }) => {
                      setCostRangeStart(start)
                      setCostRangeEnd(end)
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={openSalaryModal}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/40 rounded transition-all"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                Lançar Salários
              </button>
              <button
                type="button"
                onClick={() => {
                  window.focus()
                  setCostModal(true)
                }}
                className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Novo Custo
              </button>
            </div>
          </div>

          {/* Category + supplier + status filters */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <Select
                label="Plano de Contas"
                value={filterCategory}
                onChange={(v) => setFilterCategory(String(v))}
                options={costCategories.filter((c) => c.value !== 'fuel')}
                optional
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Select
                label="Fornecedor"
                value={filterSupplierId}
                onChange={(v) => setFilterSupplierId(String(v))}
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: (
                    <div className="flex justify-between">
                      <span>{s.name}</span>
                      {s.customId && (
                        <span className="text-on-surface-variant/50">#{s.customId}</span>
                      )}
                    </div>
                  ),
                  displayLabel: s.name,
                  searchableLabel: `${s.name} ${s.customId || ''}`,
                }))}
                optional
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Select
                label="Status"
                value={filterStatus}
                onChange={(v) => setFilterStatus(String(v))}
                options={[
                  { value: 'open', label: 'Em aberto' },
                  { value: 'paid', label: 'Pago' },
                ]}
                optional
              />
            </div>
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Data', 'Descrição', 'Veículo', 'Plano de Contas', 'Valor', ''].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredCosts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum custo registrado
                    </td>
                  </tr>
                )}
                {filteredCosts.map((row) => {
                  const cat = costCategories.find((c) => c.value === row.category)
                  return (
                    <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors group">
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface text-sm">
                          {row.description || '—'}
                        </p>
                        {row.supplier_name && (
                          <p className="text-[10px] text-on-surface-variant">{row.supplier_name}</p>
                        )}
                        {row.installment_number && row.installment_total && (
                          <p className="text-[10px] text-primary font-bold mt-0.5">
                            Parcela {row.installment_number}/{row.installment_total}
                          </p>
                        )}
                        <div className="flex gap-1 mt-1">
                          {row.kind === 'expense' && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary">
                              Despesa
                            </span>
                          )}
                          {row.status === 'open' &&
                            (row.date < today() ? (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-500/15 text-red-700">
                                Atrasado
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-700">
                                Em aberto
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                        {row.truck_license_plate ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded ${categoryBadge[row.category] ?? 'bg-surface-container-highest text-on-surface-variant'}`}
                        >
                          {cat?.label ?? row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                        {formatBRL(row.value)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {row.status === 'open' && (
                            <button
                              type="button"
                              onClick={() => {
                                setMarkPaidDate(today())
                                setMarkPaidTarget(row)
                              }}
                              className="p-2 text-on-surface-variant hover:text-tertiary hover:bg-tertiary/10 rounded-lg transition-all"
                              title="Dar baixa"
                            >
                              <span className="material-symbols-outlined text-xl">paid</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditCost(row)}
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCostTarget(row)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FUEL TAB ── */}
      {activeTab === 'fuel' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-surface-container-low px-5 py-3 rounded-xl">
                <p className="text-xs text-on-surface-variant mb-0.5">Total em Combustível</p>
                <p className="text-2xl font-black font-headline text-primary">
                  {formatBRL(totalFuel)}
                </p>
              </div>
              <MonthNavigator monthKey={fuelMonth} onChange={setFuelMonth} />
            </div>
            <button
              type="button"
              onClick={() => {
                window.focus()
                setFuelModal(true)
              }}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Novo Abastecimento
            </button>
          </div>

          {/* Filters */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px]">
              <Select
                label="Caminhão"
                value={fuelTruckFilter}
                onChange={(v) => setFuelTruckFilter(String(v))}
                options={trucks.map((t) => ({
                  value: t.id,
                  label: (
                    <div className="flex justify-between">
                      <span>{t.license_plate}</span>
                      {t.customId && (
                        <span className="text-on-surface-variant/50">#{t.customId}</span>
                      )}
                    </div>
                  ),
                  displayLabel: t.license_plate,
                  searchableLabel: `${t.license_plate} ${t.customId || ''}`,
                }))}
                optional
              />
            </div>
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {[
                    'Data',
                    'Caminhão',
                    'Posto',
                    'Litros',
                    'Hodômetro',
                    'Bruto',
                    'Crédito',
                    'Líquido',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {fuelRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum abastecimento registrado
                    </td>
                  </tr>
                )}
                {fuelRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors group">
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-primary text-sm">
                        {row.truck_license_plate}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">{row.truck_model}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {row.supplier_name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {row.liters != null ? `${Number(row.liters).toFixed(2)} L` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-on-surface">
                      {Number(row.odometer_at_service).toFixed(0)} km
                    </td>
                    <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                      {formatBRL(row.gross_value ?? row.value)}
                    </td>
                    <td className="px-6 py-4 font-black font-headline text-secondary text-sm">
                      {formatBRL(row.credit_value ?? 0)}
                    </td>
                    <td className="px-6 py-4 font-black font-headline text-primary text-sm">
                      {formatBRL(row.value)}
                      {row.voucher_number && (
                        <p className="text-[10px] text-on-surface-variant font-normal">
                          Vale {row.voucher_number}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setDeleteFuelTarget(row)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── OIL CREDITS TAB ── */}
      {activeTab === 'oil-credits' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="bg-surface-container-low px-5 py-3 rounded-xl">
                <p className="text-xs text-on-surface-variant mb-0.5">Créditos ativos</p>
                <p className="text-2xl font-black font-headline text-primary">
                  {formatBRL(oilCreditSummary?.active_amount || 0)}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {oilCreditSummary?.active_lots || 0} lote(s)
                </p>
              </div>
              <div className="bg-surface-container-low px-5 py-3 rounded-xl">
                <p className="text-xs text-on-surface-variant mb-0.5">Créditos vencidos</p>
                <p className="text-2xl font-black font-headline text-error">
                  {formatBRL(oilCreditSummary?.expired_amount || 0)}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {oilCreditSummary?.expired_lots || 0} lote(s)
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingOilCredit(null)
                setOilCreditForm({
                  customer_id: '',
                  amount: 0,
                  issued_date: today(),
                  expires_at: oneMonthFrom(today()),
                  description: '',
                })
                setOilCreditModal(true)
              }}
            >
              Novo crédito
            </Button>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
            <Select
              label="Cliente"
              value={oilCreditCustomerFilter}
              onChange={(v) => setOilCreditCustomerFilter(String(v))}
              optional
              options={customers.map((customer) => ({
                value: customer.id,
                label: customer.name,
                displayLabel: customer.name,
                searchableLabel: customer.name,
              }))}
            />
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {[
                    'Cliente',
                    'Emissão',
                    'Vencimento',
                    'Original',
                    'Disponível',
                    'Situação',
                    '',
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {oilCredits.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-bright/5 transition-colors group">
                    <td className="px-6 py-4 font-bold text-sm">{entry.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {formatDate(entry.issued_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {formatDate(entry.expires_at)}
                    </td>
                    <td className="px-6 py-4 font-black text-sm">{formatBRL(entry.amount)}</td>
                    <td className="px-6 py-4 font-black text-primary text-sm">
                      {formatBRL(entry.available_amount)}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold uppercase">
                      <span className={entry.status === 'expired' ? 'text-error' : 'text-primary'}>
                        {entry.status === 'expired'
                          ? 'Vencido'
                          : entry.status === 'exhausted'
                            ? 'Esgotado'
                            : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEditOilCredit(entry)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteOilCreditTarget(entry)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {oilCredits.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum crédito lançado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="px-6 py-4 border-b border-outline-variant/10">
              <h3 className="font-headline font-bold">Movimentações e vales</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Data', 'Tipo', 'Cliente', 'Valor', 'Vale', 'Descrição'].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {oilCreditMovements.map((movement) => (
                  <tr key={`${movement.type}-${movement.reference_id}`}>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {formatDate(movement.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">
                      {movement.type === 'entry' ? 'Entrada' : 'Consumo'}
                    </td>
                    <td className="px-6 py-4 text-sm">{movement.customer_name}</td>
                    <td className="px-6 py-4 text-sm font-black">
                      {formatBRL(
                        movement.type === 'entry' ? movement.gross_amount : movement.credit_amount,
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono">
                      {movement.voucher_number || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {movement.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COMMISSIONS TAB ── */}
      {activeTab === 'commissions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="bg-surface-container-low px-5 py-3 rounded-xl">
              <p className="text-xs text-on-surface-variant mb-0.5">Total de Comissões</p>
              <p className="text-2xl font-black font-headline text-primary">
                {formatBRL(totalCommission)}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px]">
              <DatePicker
                label="Data Inicial"
                value={commissionDateFilters.start}
                onChange={(e) => setCommissionDateFilters((f) => ({ ...f, start: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <DatePicker
                label="Data Final"
                value={commissionDateFilters.end}
                onChange={(e) => setCommissionDateFilters((f) => ({ ...f, end: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Select
                label="Motorista"
                value={commissionDateFilters.driver_id}
                onChange={(v) => setCommissionDateFilters((f) => ({ ...f, driver_id: v }))}
                options={drivers.map((d) => ({
                  value: d.id,
                  label: (
                    <div className="flex justify-between">
                      <span>{d.name}</span>
                      {d.customId && (
                        <span className="text-on-surface-variant/50">#{d.customId}</span>
                      )}
                    </div>
                  ),
                  displayLabel: d.name,
                  searchableLabel: `${d.name} ${d.customId || ''}`,
                }))}
                optional
              />
            </div>
          </div>

          <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-high">
                  {['Motorista', 'Viagens', 'Comissão Total'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {commissionData.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhuma comissão no período
                    </td>
                  </tr>
                )}
                {commissionData.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-bright/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface text-sm">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{row.trip_count}</td>
                    <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                      {formatBRL(row.total_commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREDITOR REPORT TAB ── */}
      {activeTab === 'creditor' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-surface-container-low px-5 py-3 rounded-xl">
                <p className="text-xs text-on-surface-variant mb-0.5">Total do Período</p>
                <p className="text-2xl font-black font-headline text-primary">
                  {formatBRL(creditorGrandTotal)}
                </p>
              </div>
              <div className="flex gap-1 bg-surface-container-high rounded-lg p-1 border border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setCreditorFilterMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    creditorFilterMode === 'month'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Mês
                </button>
                <button
                  type="button"
                  onClick={() => setCreditorFilterMode('range')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    creditorFilterMode === 'range'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Período
                </button>
              </div>
              {creditorFilterMode === 'month' ? (
                <MonthNavigator monthKey={creditorMonth} onChange={setCreditorMonth} />
              ) : (
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={creditorRangeStart}
                    onChange={(e) => setCreditorRangeStart(e.target.value)}
                  />
                  <span className="text-on-surface-variant text-sm">a</span>
                  <DatePicker
                    value={creditorRangeEnd}
                    onChange={(e) => setCreditorRangeEnd(e.target.value)}
                  />
                  <PeriodShortcuts
                    monthKey={creditorMonth}
                    onMonthChange={setCreditorMonth}
                    onRangeChange={({ start, end }) => {
                      setCreditorRangeStart(start)
                      setCreditorRangeEnd(end)
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Creditor filter */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[220px]">
              <Select
                label="Credor (Fornecedor)"
                value={creditorSupplierFilter}
                onChange={(v) => setCreditorSupplierFilter(String(v))}
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: (
                    <div className="flex justify-between">
                      <span>{s.name}</span>
                      {s.customId && (
                        <span className="text-on-surface-variant/50">#{s.customId}</span>
                      )}
                    </div>
                  ),
                  displayLabel: s.name,
                  searchableLabel: `${s.name} ${s.customId || ''}`,
                }))}
                optional
              />
            </div>
          </div>

          {/* Per-creditor summary */}
          <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-high">
                  {['Credor', 'Lançamentos', 'Total'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {creditorGroups.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum custo com credor no período
                    </td>
                  </tr>
                )}
                {creditorGroups.map((group) => (
                  <tr
                    key={group.supplier_id}
                    className="hover:bg-surface-bright/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-on-surface text-sm">
                      {group.supplier_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{group.count}</td>
                    <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                      {formatBRL(group.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Line-item detail, for reconciliation against a creditor's invoice */}
          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {[
                    'Data',
                    'Fornecedor',
                    'Plano de Contas',
                    'Descrição',
                    'Bruto',
                    'Crédito',
                    'Líquido',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {creditorReport.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum lançamento encontrado
                    </td>
                  </tr>
                )}
                {creditorReport.map((row) => {
                  const cat = costCategories.find((c) => c.value === row.category)
                  return (
                    <tr
                      key={`${row.source}-${row.id}`}
                      className="hover:bg-surface-bright/5 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">{row.supplier_name}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded ${categoryBadge[row.category] ?? 'bg-surface-container-highest text-on-surface-variant'}`}
                        >
                          {cat?.label ?? row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {row.description}
                      </td>
                      <td className="px-6 py-4 font-black font-headline text-on-surface text-sm">
                        {formatBRL(row.gross_value ?? row.value)}
                      </td>
                      <td className="px-6 py-4 font-black font-headline text-secondary text-sm">
                        {formatBRL(row.credit_value ?? 0)}
                      </td>
                      <td className="px-6 py-4 font-black font-headline text-primary text-sm">
                        {formatBRL(row.value)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COST MODAL ── */}
      {salaryModal && (
        <Modal title="Lançar salários" onClose={() => setSalaryModal(false)} size="xl">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <MonthNavigator monthKey={salaryMonth} onChange={changeSalaryMonth} />
              <DatePicker
                label="Data do lançamento"
                value={salaryDate}
                min={`${salaryMonth}-01`}
                max={monthRangeFromKey(salaryMonth).end}
                onChange={(e) => setSalaryDate(e.target.value)}
              />
            </div>
            <Input
              label="Buscar motorista"
              placeholder="Digite um nome"
              value={salarySearch}
              onChange={(event) => setSalarySearch(event.target.value)}
            />
            <div className="border border-outline-variant/10 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_10rem] gap-3 px-4 py-3 bg-surface-container-high text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                <span>Motorista</span>
                <span>Salário mensal</span>
                <span>Já lançado</span>
                <span>Falta pagar</span>
                <span>Valor do lançamento</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {salarySummary
                  .filter((driver) =>
                    driver.name.toLocaleLowerCase().includes(salarySearch.toLocaleLowerCase()),
                  )
                  .map((driver) => {
                    const canLaunch = driver.remaining_salary > 0
                    return (
                      <div
                        key={driver.id}
                        className="grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_10rem] items-center gap-3 p-3 border-b border-outline-variant/10 last:border-b-0"
                      >
                        <span className="font-bold text-sm text-on-surface">{driver.name}</span>
                        <span className="text-sm text-on-surface-variant">
                          {formatBRL(driver.monthly_salary)}
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          {formatBRL(driver.issued_salary)}
                        </span>
                        <span
                          className={`text-sm font-bold ${canLaunch ? 'text-primary' : 'text-tertiary'}`}
                        >
                          {formatBRL(driver.remaining_salary)}
                        </span>
                        <div>
                          <CurrencyInput
                            ref={(element) => {
                              salaryValueRefs.current[driver.id] = element
                              if (driver.id === salarySummary[0]?.id) {
                                firstSalaryValueRef.current = element
                              }
                            }}
                            value={salaryValues[driver.id] ?? 0}
                            onChange={(value) =>
                              setSalaryValues((current) => ({
                                ...current,
                                [driver.id]: Math.min(value, driver.remaining_salary),
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Tab') {
                                const visibleDriverIds = salarySummary
                                  .filter((item) =>
                                    item.name
                                      .toLocaleLowerCase()
                                      .includes(salarySearch.toLocaleLowerCase()),
                                  )
                                  .map((item) => item.id)
                                const nextDriverId = getNextSalaryDriverId(
                                  visibleDriverIds,
                                  driver.id,
                                  event.shiftKey ? -1 : 1,
                                )
                                if (nextDriverId !== null) {
                                  event.preventDefault()
                                  salaryValueRefs.current[nextDriverId]?.focus()
                                }
                              } else if (event.key === 'Enter') {
                                event.preventDefault()
                                issueSalaries()
                              }
                            }}
                            disabled={salaryLoading}
                          />
                        </div>
                      </div>
                    )
                  })}
                {!salaryLoading && salarySummary.length === 0 && (
                  <div className="p-8 text-center text-sm text-on-surface-variant">
                    Nenhum motorista elegível.
                  </div>
                )}
                {salaryLoading && (
                  <div className="p-8 text-center text-sm text-on-surface-variant">
                    Carregando saldos...
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-on-surface-variant">
                Tab: próximo valor · Enter: lançar · Esc: fechar
              </span>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setSalaryModal(false)}>
                  Cancelar
                </Button>
                <Button disabled={salaryLoading} onClick={issueSalaries}>
                  Lançar salários
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {costModal && (
        <Modal
          title={editingCost ? 'Editar Custo' : 'Novo Custo'}
          onClose={() => setCostModal(false)}
          onEscape={handleCostEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="category"
                control={costControl}
                render={({ field }) => (
                  <Select
                    ref={categorySelectRef}
                    label="Plano de Contas"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => dateRef.current?.focus()}
                    error={costErrors.category?.message}
                    options={costCategories.filter(
                      (c) => c.value !== 'fuel' || editingCost?.category === 'fuel',
                    )}
                  />
                )}
              />
            </div>
            <Controller
              name="date"
              control={costControl}
              render={({ field }) => (
                <DatePicker
                  ref={dateRef}
                  label={isInstallment ? 'Data da 1ª parcela' : 'Data'}
                  value={field.value}
                  onChange={field.onChange}
                  error={costErrors.date?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      valueRef.current?.focus()
                    }
                  }}
                />
              )}
            />
            <Controller
              name="value"
              control={costControl}
              render={({ field }) => (
                <CurrencyInput
                  ref={valueRef}
                  label={isInstallment ? 'Valor total' : 'Valor'}
                  value={field.value}
                  onChange={field.onChange}
                  error={costErrors.value?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (isInstallment) {
                        installmentsRef.current?.focus()
                      } else {
                        truckSelectRef.current?.open()
                      }
                    }
                  }}
                />
              )}
            />

            {/* Installment toggle */}
            <div className="col-span-2 flex items-center gap-3 py-1">
              <button
                type="button"
                role="switch"
                aria-checked={isInstallment}
                onClick={() => {
                  const next = !isInstallment
                  setIsInstallment(next)
                  setCostValue('installments', next ? 2 : 1)
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isInstallment ? 'bg-primary' : 'bg-outline-variant'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isInstallment ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-on-surface-variant">Parcelar</span>
            </div>

            {/* Custo vs Despesa */}
            <div className="col-span-2">
              <Controller
                name="kind"
                control={costControl}
                render={({ field }) => (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Tipo
                    </span>
                    <div className="flex bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-1 gap-1">
                      {(
                        [
                          { value: 'operational', label: 'Custo' },
                          { value: 'expense', label: 'Despesa' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${
                            field.value === opt.value
                              ? 'bg-primary text-on-primary'
                              : 'text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              />
            </div>

            {isInstallment && (
              <div className="col-span-2">
                <Controller
                  name="installments"
                  control={costControl}
                  render={({ field }) => (
                    <Input
                      ref={installmentsRef}
                      label="Número de parcelas"
                      type="number"
                      min={1}
                      max={360}
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      error={costErrors.installments?.message}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          truckSelectRef.current?.open()
                        }
                      }}
                    />
                  )}
                />
              </div>
            )}

            <Controller
              name="truck_id"
              control={costControl}
              render={({ field }) => (
                <Select
                  ref={truckSelectRef}
                  label="Veículo"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => supplierSelectRef.current?.open()}
                  error={costErrors.truck_id?.message}
                  options={trucks.map((t) => ({
                    value: t.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{t.license_plate}</span>
                        {t.customId && (
                          <span className="text-on-surface-variant/50">#{t.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: t.license_plate,
                    searchableLabel: `${t.license_plate} ${t.customId || ''}`,
                  }))}
                />
              )}
            />
            <Controller
              name="supplier_id"
              control={costControl}
              render={({ field }) => (
                <Select
                  ref={supplierSelectRef}
                  label="Fornecedor"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => driverSelectRef.current?.open()}
                  error={costErrors.supplier_id?.message}
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{s.name}</span>
                        {s.customId && (
                          <span className="text-on-surface-variant/50">#{s.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: s.name,
                    searchableLabel: `${s.name} ${s.customId || ''}`,
                  }))}
                />
              )}
            />
            <Controller
              name="driver_id"
              control={costControl}
              render={({ field }) => (
                <Select
                  ref={driverSelectRef}
                  label="Motorista"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  onEnterSelect={() => descRef.current?.focus()}
                  error={costErrors.driver_id?.message}
                  options={drivers.map((d) => ({
                    value: d.id,
                    label: (
                      <div className="flex justify-between">
                        <span>{d.name}</span>
                        {d.customId && (
                          <span className="text-on-surface-variant/50">#{d.customId}</span>
                        )}
                      </div>
                    ),
                    displayLabel: d.name,
                    searchableLabel: `${d.name} ${d.customId || ''}`,
                  }))}
                />
              )}
            />
            <div className="col-span-2">
              <Controller
                name="description"
                control={costControl}
                render={({ field }) => (
                  <Input
                    ref={descRef}
                    label="Descrição"
                    optional
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={costErrors.description?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCostSubmit(onCostEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setCostModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCostSubmit(onCostSubmit as any)}>
              {editingCost ? 'Salvar Alterações' : 'Salvar Custo'}
            </Button>
          </div>
        </Modal>
      )}

      {oilCreditModal && (
        <Modal
          title={editingOilCredit ? 'Editar crédito de óleo' : 'Novo crédito de óleo'}
          onClose={() => {
            setOilCreditModal(false)
            setEditingOilCredit(null)
          }}
        >
          <div className="space-y-4">
            <Select
              label="Cliente"
              value={oilCreditForm.customer_id}
              onChange={(value) =>
                setOilCreditForm((form) => ({ ...form, customer_id: String(value) }))
              }
              options={customers.map((customer) => ({
                value: customer.id,
                label: customer.name,
                displayLabel: customer.name,
                searchableLabel: customer.name,
              }))}
            />
            <CurrencyInput
              label="Valor do crédito"
              value={oilCreditForm.amount}
              onChange={(value) => setOilCreditForm((form) => ({ ...form, amount: value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Data de lançamento"
                value={oilCreditForm.issued_date}
                onChange={(event) =>
                  setOilCreditForm((form) => ({ ...form, issued_date: event.target.value }))
                }
              />
              <DatePicker
                label="Vencimento"
                value={oilCreditForm.expires_at}
                onChange={(event) =>
                  setOilCreditForm((form) => ({ ...form, expires_at: event.target.value }))
                }
              />
            </div>
            <Input
              label="Observação"
              optional
              value={oilCreditForm.description}
              onChange={(event) =>
                setOilCreditForm((form) => ({ ...form, description: event.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setOilCreditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={saveOilCredit}>
              {editingOilCredit ? 'Salvar alterações' : 'Lançar crédito'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── FUEL MODAL ── */}
      {fuelModal && (
        <Modal
          title="Novo Abastecimento"
          onClose={() => setFuelModal(false)}
          onEscape={handleFuelEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="truck_id"
                control={fuelControl}
                render={({ field }) => (
                  <Select
                    ref={fuelTruckSelectRef}
                    label="Caminhão"
                    icon="local_shipping"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => fuelDateRef.current?.focus()}
                    error={fuelErrors.truck_id?.message}
                    options={trucks.map((t) => ({
                      value: t.id,
                      label: (
                        <div className="flex justify-between">
                          <span>{t.license_plate}</span>
                          {t.customId && (
                            <span className="text-on-surface-variant/50">#{t.customId}</span>
                          )}
                        </div>
                      ),
                      displayLabel: t.license_plate,
                      searchableLabel: `${t.license_plate} ${t.customId || ''}`,
                    }))}
                  />
                )}
              />
            </div>
            <Controller
              name="date"
              control={fuelControl}
              render={({ field }) => (
                <DatePicker
                  ref={fuelDateRef}
                  label="Data"
                  value={field.value}
                  onChange={field.onChange}
                  error={fuelErrors.date?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      fuelOdometerRef.current?.focus()
                    }
                  }}
                />
              )}
            />
            <Controller
              name="odometer_at_service"
              control={fuelControl}
              render={({ field }) => (
                <div>
                  <Input
                    ref={fuelOdometerRef}
                    label="Hodômetro Atual (km)"
                    type="number"
                    placeholder="0"
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={fuelErrors.odometer_at_service?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        fuelLitersRef.current?.focus()
                      }
                    }}
                  />
                  {selectedTruck && (
                    <p className="text-[11px] text-on-surface-variant/60 mt-1 ml-1">
                      Hodômetro registrado: {Number(selectedTruck.current_odometer).toFixed(0)} km
                    </p>
                  )}
                </div>
              )}
            />
            <Controller
              name="liters"
              control={fuelControl}
              render={({ field }) => (
                <Input
                  ref={fuelLitersRef}
                  label="Litros"
                  optional
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={fuelErrors.liters?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      fuelValueRef.current?.focus()
                    }
                  }}
                />
              )}
            />
            <Controller
              name="value"
              control={fuelControl}
              render={({ field }) => (
                <CurrencyInput
                  ref={fuelValueRef}
                  label="Valor Total"
                  value={field.value}
                  onChange={field.onChange}
                  error={fuelErrors.value?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      fuelSupplierSelectRef.current?.open()
                    }
                  }}
                />
              )}
            />
            <div className="col-span-2">
              <Controller
                name="credit_mode"
                control={fuelControl}
                render={({ field }) => (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Forma de lançamento
                    </span>
                    <div className="flex bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-1 gap-1">
                      {(
                        [
                          { value: 'normal', label: 'Normal' },
                          { value: 'credit', label: 'Com créditos' },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${
                            field.value === option.value
                              ? 'bg-primary text-on-primary'
                              : 'text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              />
            </div>
            {selectedFuelCreditMode === 'credit' && (
              <>
                <div className="col-span-2">
                  <Controller
                    name="credit_customer_id"
                    control={fuelControl}
                    render={({ field }) => (
                      <Select
                        label="Cliente do crédito"
                        value={field.value}
                        onChange={field.onChange}
                        error={fuelErrors.credit_customer_id?.message}
                        options={customers.map((customer) => ({
                          value: customer.id,
                          label: customer.name,
                          displayLabel: customer.name,
                          searchableLabel: customer.name,
                        }))}
                      />
                    )}
                  />
                </div>
                <Controller
                  name="voucher_number"
                  control={fuelControl}
                  render={({ field }) => (
                    <Input
                      label="Número do vale"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      error={fuelErrors.voucher_number?.message}
                    />
                  )}
                />
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 self-end">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Créditos disponíveis
                  </p>
                  <p className="text-lg font-black text-primary">
                    {formatBRL(fuelCreditBalance.active)}
                  </p>
                  {fuelCreditBalance.expired > 0 && (
                    <p className="text-[11px] text-on-surface-variant">
                      Vencidos: {formatBRL(fuelCreditBalance.expired)}
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="col-span-2">
              <Controller
                name="supplier_id"
                control={fuelControl}
                render={({ field }) => (
                  <Select
                    ref={fuelSupplierSelectRef}
                    label="Posto de Combustível"
                    optional
                    icon="local_gas_station"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => fuelNotesRef.current?.focus()}
                    error={fuelErrors.supplier_id?.message}
                    options={gasStations.map((s) => ({
                      value: s.id,
                      label: (
                        <div className="flex justify-between">
                          <span>{s.name}</span>
                          {s.customId && (
                            <span className="text-on-surface-variant/50">#{s.customId}</span>
                          )}
                        </div>
                      ),
                      displayLabel: s.name,
                      searchableLabel: `${s.name} ${s.customId || ''}`,
                    }))}
                  />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                name="notes"
                control={fuelControl}
                render={({ field }) => (
                  <Input
                    ref={fuelNotesRef}
                    label="Observações"
                    optional
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={fuelErrors.notes?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleFuelSubmit(onFuelEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setFuelModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFuelSubmit(onFuelSubmit as any)}>Registrar Abastecimento</Button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM MODALS ── */}
      {pendingCost && (
        <ConfirmModal
          message="Tem certeza que deseja lançar este custo?"
          onConfirm={() => saveCost(pendingCost)}
          onCancel={() => setPendingCost(null)}
        />
      )}
      {deleteCostTarget && (
        <ConfirmModal
          message="Excluir este custo?"
          onConfirm={handleDeleteCost}
          onCancel={() => setDeleteCostTarget(null)}
        />
      )}
      {showCostDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={() => {
            setShowCostDiscardConfirm(false)
            setCostModal(false)
          }}
          onCancel={() => setShowCostDiscardConfirm(false)}
        />
      )}
      {markPaidTarget && (
        <Modal title="Dar Baixa" onClose={() => setMarkPaidTarget(null)}>
          <p className="text-sm text-on-surface-variant mb-4">
            Dar baixa na parcela de{' '}
            <span className="font-bold text-on-surface">{formatBRL(markPaidTarget.value)}</span>
            {markPaidTarget.installment_number && markPaidTarget.installment_total
              ? ` (${markPaidTarget.installment_number}/${markPaidTarget.installment_total})`
              : ''}
            .
          </p>
          <DatePicker
            label="Data do pagamento"
            value={markPaidDate}
            onChange={(e) => setMarkPaidDate(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setMarkPaidTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleMarkCostPaid}>Confirmar</Button>
          </div>
        </Modal>
      )}
      {pendingFuel && (
        <ConfirmModal
          message="Confirmar o registro deste abastecimento?"
          onConfirm={() => saveFuel(pendingFuel)}
          onCancel={() => setPendingFuel(null)}
        />
      )}
      {deleteFuelTarget && (
        <ConfirmModal
          message="Excluir este registro de abastecimento? O hodômetro do caminhão será recalculado."
          onConfirm={handleDeleteFuel}
          onCancel={() => setDeleteFuelTarget(null)}
        />
      )}
      {deleteOilCreditTarget && (
        <ConfirmModal
          message="Excluir esta entrada de crédito? Entradas já consumidas não podem ser excluídas."
          onConfirm={() => {
            deleteOilCredit(deleteOilCreditTarget.id)
            setDeleteOilCreditTarget(null)
          }}
          onCancel={() => setDeleteOilCreditTarget(null)}
        />
      )}
      {showFuelDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={() => {
            setShowFuelDiscardConfirm(false)
            setFuelModal(false)
          }}
          onCancel={() => setShowFuelDiscardConfirm(false)}
        />
      )}
    </div>
  )
}
