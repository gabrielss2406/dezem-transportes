import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { type OdometerWarning, getOdometerWarning } from '../../../shared/maintenanceOdometer'
import { maintenanceRecordSchema, maintenanceTypeSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import {
  Badge,
  Button,
  ConfirmModal,
  DatePicker,
  Input,
  Modal,
  Select,
  type SelectRef,
  Toast,
  useToast,
} from '../components/ui'
import type {
  MaintenanceRecord,
  MaintenanceType,
  Truck,
  TruckMaintenanceStatus,
} from '../lib/types'

// ── Form data types ───────────────────────────────────────────────────────────

interface RecordFormData {
  truck_id: number | string
  maintenance_type_id: number | string
  date: string
  odometer_at_service: number | string
  notes?: string
}

interface TypeFormData {
  name: string
  description?: string
  tracks_mileage: number
  interval_km: number | string
  is_active: number
}

const EMPTY_RECORD: RecordFormData = {
  truck_id: '',
  maintenance_type_id: '',
  date: new Date().toISOString().slice(0, 10),
  odometer_at_service: '',
  notes: '',
}

const EMPTY_TYPE: TypeFormData = {
  name: '',
  description: '',
  tracks_mileage: 1,
  interval_km: '',
  is_active: 1,
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ok: { label: 'Em Dia', color: 'green' as const, icon: 'check_circle' },
  due_soon: { label: 'Próximo', color: 'amber' as const, icon: 'schedule' },
  overdue: { label: 'Vencido', color: 'red' as const, icon: 'warning' },
  never: { label: 'Sem Registro', color: 'red' as const, icon: 'help' },
}

const STATUS_PRIORITY: Record<string, number> = {
  never: 0,
  overdue: 1,
  due_soon: 2,
  ok: 3,
}

function getWorstStatus(truck: TruckMaintenanceStatus): string {
  if (!truck.types.length) {
    return 'ok'
  }
  return truck.types.reduce(
    (worst, t) => (STATUS_PRIORITY[t.status] < STATUS_PRIORITY[worst] ? t.status : worst),
    'ok',
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function MaintenancePage() {
  // Data
  const [statusData, setStatusData] = useState<TruckMaintenanceStatus[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [types, setTypes] = useState<MaintenanceType[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(false)

  // Tab
  const [tab, setTab] = useState<'status' | 'history'>('status')

  // Status filters
  const [truckFilter, setTruckFilter] = useState<number | ''>('')
  const [typeFilter, setTypeFilter] = useState<number | ''>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // History filters
  const [histFilters, setHistFilters] = useState<{
    truck_id: number | ''
    maintenance_type_id: number | ''
    startDate: string
    endDate: string
  }>({ truck_id: '', maintenance_type_id: '', startDate: '', endDate: '' })

  // Modals
  const [recordModal, setRecordModal] = useState(false)
  const [pendingRecord, setPendingRecord] = useState<any>(null)
  const [odometerWarning, setOdometerWarning] = useState<OdometerWarning | null>(null)
  const [showRecordDiscardConfirm, setShowRecordDiscardConfirm] = useState(false)
  const [typesView, setTypesView] = useState<null | 'list' | 'form'>(null)
  const [editingType, setEditingType] = useState<MaintenanceType | null>(null)
  const [pendingType, setPendingType] = useState<any>(null)
  const [showTypeDiscardConfirm, setShowTypeDiscardConfirm] = useState(false)
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<MaintenanceRecord | null>(null)
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<MaintenanceType | null>(null)

  const { toast, show } = useToast()

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.state?.openModal) {
      openRecord()
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  // ── Forms ──────────────────────────────────────────────────────────────────

  const truckSelectRef = useRef<SelectRef>(null)
  const typeSelectRef = useRef<SelectRef>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const odometerRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit: handleRecord,
    control: controlRecord,
    reset: resetRecord,
    watch: watchRecord,
    setError: setRecordError,
    formState: { errors: recordErrors, isDirty: isRecordDirty },
  } = useForm<RecordFormData>({
    resolver: zodResolver(maintenanceRecordSchema) as any,
    defaultValues: EMPTY_RECORD,
    mode: 'all',
  })

  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit: handleType,
    control: controlType,
    reset: resetType,
    watch: watchType,
    setError: setTypeError,
    formState: { errors: typeErrors, isDirty: isTypeDirty },
  } = useForm<TypeFormData>({
    resolver: zodResolver(maintenanceTypeSchema) as any,
    defaultValues: EMPTY_TYPE,
    mode: 'all',
  })

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const [status, allTypes, allTrucks] = await Promise.all([
        window.api.maintenance.getStatus({}),
        window.api.maintenance.listTypes(true),
        window.api.trucks.list(),
      ])
      setStatusData(status)
      setTypes(allTypes)
      setTrucks(allTrucks)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    const recs = await window.api.maintenance.listRecords(histFilters)
    setRecords(recs)
  }, [histFilters])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (tab === 'history') {
      loadHistory()
    }
  }, [tab, loadHistory])

  // ── Record modal ───────────────────────────────────────────────────────────

  function openRecord(truckId?: number, typeId?: number) {
    resetRecord({
      ...EMPTY_RECORD,
      truck_id: truckId ?? '',
      maintenance_type_id: typeId ?? '',
    })
    setRecordModal(true)
  }

  useEffect(() => {
    if (recordModal) {
      setTimeout(() => {
        window.focus()
        truckSelectRef.current?.open()
      }, 200)
    } else {
      resetRecord(EMPTY_RECORD)
    }
  }, [recordModal, resetRecord])

  async function saveRecord(data: RecordFormData, confirmed = false) {
    const type = types.find((t) => t.id === Number(data.maintenance_type_id))
    const odometer =
      data.odometer_at_service === '' || data.odometer_at_service == null
        ? null
        : Number(data.odometer_at_service)

    // Client-side mirror of the handler rules, so the user gets inline feedback.
    if (type?.tracks_mileage && odometer == null) {
      setPendingRecord(null)
      setRecordError('odometer_at_service', {
        message: 'Quilometragem operacional é obrigatória para este tipo de manutenção.',
      })
      return
    }
    // Late entries legitimately carry a km behind the truck's current odometer, so an
    // inconsistent km only triggers a warning the user can confirm — never a block.
    if (odometer != null && !confirmed) {
      const readings = await window.api.maintenance.getOdometerReadings(Number(data.truck_id))
      const warning = getOdometerWarning(readings, data.date, odometer)
      if (warning) {
        setPendingRecord(null)
        setOdometerWarning(warning)
        return
      }
    }
    setOdometerWarning(null)

    const result = await window.api.maintenance.createRecord(data as any)
    if (result?.ok === false) {
      setPendingRecord(null)
      const errs = (result as any).errors ?? {}
      if (errs.odometer_at_service) {
        setRecordError('odometer_at_service', { message: errs.odometer_at_service })
      }
      show(
        errs.form ?? errs.odometer_at_service ?? errs.maintenance_type_id ?? 'Erro ao registrar',
        'error',
      )
      return
    }
    show('Manutenção registrada!')
    setRecordModal(false)
    setPendingRecord(null)
    loadStatus()
    if (tab === 'history') {
      loadHistory()
    }
  }

  const onRecordSubmit = (data: RecordFormData) => saveRecord(data)
  const onRecordEnterSubmit = (data: RecordFormData) => setPendingRecord(data)

  const handleRecordEscape = () => {
    if (isRecordDirty) {
      setShowRecordDiscardConfirm(true)
    } else {
      setRecordModal(false)
    }
  }

  // ── Types management ───────────────────────────────────────────────────────

  function openTypeForm(type?: MaintenanceType) {
    setEditingType(type ?? null)
    resetType(
      type
        ? {
            name: type.name,
            description: type.description ?? '',
            tracks_mileage: type.tracks_mileage ?? 1,
            interval_km: type.tracks_mileage ? type.interval_km : '',
            is_active: type.is_active,
          }
        : EMPTY_TYPE,
    )
    setTypesView('form')
  }

  useEffect(() => {
    if (typesView === 'form') {
      setTimeout(() => {
        window.focus()
        nameRef.current?.focus()
      }, 200)
    }
  }, [typesView])

  async function saveType(data: TypeFormData) {
    if (data.tracks_mileage === 1 && (data.interval_km === '' || Number(data.interval_km) <= 0)) {
      setPendingType(null)
      setTypeError('interval_km', {
        message: 'Obrigatório para tipos que afetam a quilometragem.',
      })
      return
    }
    let result: any
    if (editingType) {
      result = await window.api.maintenance.updateType(editingType.id, data as any)
    } else {
      result = await window.api.maintenance.createType(data as any)
    }
    if (result?.ok === false) {
      setPendingType(null)
      const errs = (result as any).errors ?? {}
      show(errs.form ?? errs.interval_km ?? 'Erro ao salvar', 'error')
      return
    }
    show(editingType ? 'Tipo atualizado!' : 'Tipo criado!')
    setTypesView('list')
    setPendingType(null)
    loadStatus()
  }

  const onTypeSubmit = (data: TypeFormData) => saveType(data)
  const onTypeEnterSubmit = (data: TypeFormData) => setPendingType(data)

  const handleTypeEscape = () => {
    if (isTypeDirty) {
      setShowTypeDiscardConfirm(true)
    } else {
      setTypesView('list')
    }
  }

  async function confirmDeleteType() {
    if (!deleteTypeTarget) {
      return
    }
    const result = await window.api.maintenance.deleteType(deleteTypeTarget.id)
    if (!result.ok) {
      show(result.error || 'Não foi possível excluir', 'error')
    } else {
      show('Tipo excluído!')
      loadStatus()
    }
    setDeleteTypeTarget(null)
  }

  // ── Record deletion ────────────────────────────────────────────────────────

  async function confirmDeleteRecord() {
    if (!deleteRecordTarget) {
      return
    }
    await window.api.maintenance.deleteRecord(deleteRecordTarget.id)
    show('Registro excluído!')
    setDeleteRecordTarget(null)
    loadHistory()
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const activeTypes = types.filter((t) => t.is_active)
  const mileageTypes = activeTypes.filter((t) => t.tracks_mileage)

  // Selected type in the record form drives whether operational mileage is required.
  const watchedRecordTypeId = watchRecord('maintenance_type_id')
  const watchedRecordTruckId = watchRecord('truck_id')
  const watchedRecordDate = watchRecord('date')
  const watchedRecordOdometer = watchRecord('odometer_at_service')

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear the stale warning when the inputs it was computed from change
  useEffect(() => {
    setOdometerWarning(null)
  }, [watchedRecordTruckId, watchedRecordDate, watchedRecordOdometer])
  const selectedRecordType = types.find((t) => t.id === Number(watchedRecordTypeId))
  const recordTracksMileage = selectedRecordType ? !!selectedRecordType.tracks_mileage : true
  const selectedRecordTruck = trucks.find((t) => t.id === Number(watchedRecordTruckId))

  const typeTracksMileage = watchType('tracks_mileage') === 1

  const filteredStatus = useMemo(() => {
    return statusData
      .map((truck) => ({
        ...truck,
        types:
          typeFilter !== '' ? truck.types.filter((t) => t.type_id === typeFilter) : truck.types,
      }))
      .filter((truck) => {
        if (truckFilter !== '' && truck.truck_id !== truckFilter) {
          return false
        }
        if (statusFilter) {
          return truck.types.some((t) => t.status === statusFilter)
        }
        return true
      })
      .sort((a, b) => STATUS_PRIORITY[getWorstStatus(a)] - STATUS_PRIORITY[getWorstStatus(b)])
  }, [statusData, truckFilter, typeFilter, statusFilter])

  const truckOptions = trucks.map((t) => ({
    value: t.id,
    label: (
      <div className="flex justify-between">
        <span>{t.license_plate}</span>
        {t.customId && <span className="text-on-surface-variant/50">#{t.customId}</span>}
      </div>
    ),
    displayLabel: t.license_plate,
    searchableLabel: `${t.license_plate} ${t.model ?? ''} ${t.customId || ''}`,
  }))

  const typeOptions = activeTypes.map((t) => ({
    value: t.id,
    label: t.name,
    displayLabel: t.name,
    searchableLabel: t.name,
  }))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão de Frota"
        title="Manutenção"
        subtitle="Controle de manutenção preventiva da frota."
        actionLabel="Registrar Manutenção"
        onAction={() => openRecord()}
        secondaryActionLabel="Gerenciar Tipos"
        onSecondaryAction={() => setTypesView('list')}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-container-high rounded-lg p-1 w-fit border border-outline-variant/10">
        <button
          type="button"
          onClick={() => setTab('status')}
          className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${
            tab === 'status'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1.5">
            monitoring
          </span>
          Status Geral
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${
            tab === 'history'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1.5">history</span>
          Histórico
        </button>
      </div>

      {/* ── STATUS TAB ────────────────────────────────────────────────────── */}
      {tab === 'status' && (
        <>
          <div className="bg-surface-container-low p-4 rounded-xl mb-10 border border-outline-variant/10 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <Select
                  label="Caminhão"
                  optional
                  value={truckFilter}
                  onChange={(v) => setTruckFilter(v === '' ? '' : Number(v))}
                  options={trucks.map((t) => ({
                    value: t.id,
                    label: `${t.license_plate} — ${t.model}`,
                    searchableLabel: `${t.license_plate} ${t.model}`,
                  }))}
                  placeholder="Todos os caminhões"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Select
                  label="Tipo"
                  optional
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v === '' ? '' : Number(v))}
                  options={mileageTypes.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Todos os tipos"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <Select
                  label="Status"
                  optional
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as string)}
                  options={[
                    { value: 'overdue', label: 'Vencido' },
                    { value: 'never', label: 'Sem Registro' },
                    { value: 'due_soon', label: 'Próximo' },
                    { value: 'ok', label: 'Em Dia' },
                  ]}
                  placeholder="Todos os status"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant -mt-6 mb-8 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">info</span>
            Mostra apenas tipos de manutenção que afetam o controle de quilometragem. Serviços
            informativos aparecem apenas no histórico.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin mr-2">autorenew</span>
              Carregando...
            </div>
          ) : filteredStatus.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant text-sm">
              Nenhum caminhão encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStatus.map((truck) => {
                const worst = getWorstStatus(truck)
                const worstCfg = STATUS_CONFIG[worst as keyof typeof STATUS_CONFIG]
                return (
                  <div
                    key={truck.truck_id}
                    className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden"
                  >
                    {/* Truck header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-surface-container-high">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-xl">
                          local_shipping
                        </span>
                        <div>
                          <span className="font-bold text-on-surface font-mono">
                            {truck.truck_license_plate}
                          </span>
                          <span className="text-on-surface-variant text-sm ml-2">
                            — {truck.truck_model}
                          </span>
                        </div>
                        <Badge label={worstCfg.label} color={worstCfg.color} />
                      </div>
                      <span className="text-sm text-on-surface-variant">
                        Odômetro:{' '}
                        <span className="font-bold text-on-surface">
                          {truck.current_odometer.toLocaleString('pt-BR')} km
                        </span>
                      </span>
                    </div>

                    {/* Maintenance items */}
                    <div className="divide-y divide-outline-variant/10">
                      {truck.types.length === 0 ? (
                        <div className="px-6 py-4 text-sm text-on-surface-variant italic">
                          Nenhum tipo ativo correspondente.
                        </div>
                      ) : (
                        truck.types.map((type) => {
                          const cfg = STATUS_CONFIG[type.status as keyof typeof STATUS_CONFIG]
                          const isOverdue = type.status === 'overdue' || type.status === 'never'
                          const isDueSoon = type.status === 'due_soon'
                          return (
                            <div
                              key={type.type_id}
                              className="flex items-center justify-between px-6 py-4 hover:bg-surface-bright/5 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <Badge label={cfg.label} color={cfg.color} />
                                <div>
                                  <div className="font-medium text-sm text-on-surface">
                                    {type.type_name}
                                  </div>
                                  <div className="text-xs text-on-surface-variant mt-0.5">
                                    {type.last_date
                                      ? `Último: ${new Date(
                                          `${type.last_date}T00:00:00`,
                                        ).toLocaleDateString('pt-BR')}${
                                          type.km_since_last != null
                                            ? ` — ${type.km_since_last.toLocaleString('pt-BR')} km atrás`
                                            : ''
                                        }`
                                      : 'Nenhum registro anterior'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-right min-w-[140px]">
                                  {type.km_remaining != null ? (
                                    <>
                                      <div
                                        className={`text-sm font-bold ${
                                          isOverdue
                                            ? 'text-error'
                                            : isDueSoon
                                              ? 'text-amber-500'
                                              : 'text-tertiary'
                                        }`}
                                      >
                                        {type.km_remaining <= 0
                                          ? `${Math.abs(type.km_remaining).toLocaleString('pt-BR')} km atrasado`
                                          : `${type.km_remaining.toLocaleString('pt-BR')} km restantes`}
                                      </div>
                                      <div className="text-xs text-on-surface-variant">
                                        Intervalo: {type.interval_km.toLocaleString('pt-BR')} km
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-xs text-on-surface-variant">
                                      Intervalo: {type.interval_km.toLocaleString('pt-BR')} km
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openRecord(truck.truck_id, type.type_id)}
                                >
                                  <span className="material-symbols-outlined text-base mr-1">
                                    build
                                  </span>
                                  Registrar
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <>
          <div className="bg-surface-container-low p-4 rounded-xl mb-10 border border-outline-variant/10 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <Select
                  label="Caminhão"
                  optional
                  value={histFilters.truck_id}
                  onChange={(v) =>
                    setHistFilters((f) => ({
                      ...f,
                      truck_id: v === '' ? '' : Number(v),
                    }))
                  }
                  options={trucks.map((t) => ({
                    value: t.id,
                    label: `${t.license_plate} — ${t.model}`,
                    searchableLabel: `${t.license_plate} ${t.model}`,
                  }))}
                  placeholder="Todos"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Select
                  label="Tipo"
                  optional
                  value={histFilters.maintenance_type_id}
                  onChange={(v) =>
                    setHistFilters((f) => ({
                      ...f,
                      maintenance_type_id: v === '' ? '' : Number(v),
                    }))
                  }
                  options={types.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Todos"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <DatePicker
                  label="De"
                  value={histFilters.startDate}
                  onChange={(e) => setHistFilters((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <DatePicker
                  label="Até"
                  value={histFilters.endDate}
                  onChange={(e) => setHistFilters((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high">
                  {['Data', 'Caminhão', 'Tipo de Manutenção', 'Quilometragem', 'Notas', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-on-surface-variant text-sm"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  records.map((rec, i) => (
                    <tr
                      key={rec.id}
                      className={`hover:bg-surface-bright/5 transition-colors group ${
                        i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {new Date(`${rec.date}T00:00:00`).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-mono font-bold text-primary">
                          {rec.truck_license_plate}
                        </span>
                        <span className="text-on-surface-variant ml-1.5">{rec.truck_model}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">
                        <div className="flex items-center gap-2">
                          <span>{rec.type_name}</span>
                          <Badge
                            label={rec.tracks_mileage ? 'Afeta KM' : 'Informativo'}
                            color={rec.tracks_mileage ? 'blue' : 'gray'}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">
                        {rec.odometer_at_service != null
                          ? `${rec.odometer_at_service.toLocaleString('pt-BR')} km`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {rec.notes || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setDeleteRecordTarget(rec)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── RECORD MODAL ─────────────────────────────────────────────────────── */}
      {recordModal && (
        <Modal
          title="Registrar Manutenção"
          onClose={() => setRecordModal(false)}
          onEscape={handleRecordEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="truck_id"
                control={controlRecord}
                render={({ field }) => (
                  <Select
                    ref={truckSelectRef}
                    label="Caminhão"
                    icon="local_shipping"
                    options={truckOptions}
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => typeSelectRef.current?.open()}
                    error={recordErrors.truck_id?.message as string}
                  />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                name="maintenance_type_id"
                control={controlRecord}
                render={({ field }) => (
                  <Select
                    ref={typeSelectRef}
                    label="Tipo de Manutenção"
                    icon="build"
                    options={typeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => dateRef.current?.focus()}
                    error={recordErrors.maintenance_type_id?.message as string}
                  />
                )}
              />
            </div>
            <Controller
              name="date"
              control={controlRecord}
              render={({ field }) => (
                <DatePicker
                  ref={dateRef}
                  label="Data do Serviço"
                  value={field.value}
                  onChange={field.onChange}
                  error={recordErrors.date?.message}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      odometerRef.current?.focus()
                    }
                  }}
                />
              )}
            />
            <div className="flex flex-col gap-1.5">
              <Controller
                name="odometer_at_service"
                control={controlRecord}
                render={({ field }) => (
                  <Input
                    ref={odometerRef}
                    label="Quilometragem Operacional (km)"
                    optional={!recordTracksMileage}
                    type="number"
                    placeholder="Ex: 45000"
                    value={field.value}
                    onChange={field.onChange}
                    error={recordErrors.odometer_at_service?.message as string}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        notesRef.current?.focus()
                      }
                    }}
                  />
                )}
              />
              {selectedRecordType && (
                <p className="text-xs text-on-surface-variant">
                  {recordTracksMileage
                    ? 'Usada para recalcular e reiniciar o intervalo de manutenção deste tipo.'
                    : 'Tipo informativo — não afeta o controle de quilometragem da frota. Preenchimento opcional.'}
                </p>
              )}
              {odometerWarning && (
                <div
                  role="alert"
                  className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-on-surface"
                >
                  <p>
                    {odometerWarning.kind === 'below_previous'
                      ? 'Km menor que o último registro'
                      : 'Km maior que o próximo registro'}{' '}
                    ({odometerWarning.reference.odometer.toLocaleString('pt-BR')} km em{' '}
                    {odometerWarning.reference.date.split('-').reverse().join('/')},{' '}
                    {odometerWarning.reference.source === 'fuel' ? 'abastecimento' : 'manutenção'}
                    ). Confira o valor ou confirme para salvar mesmo assim.
                  </p>
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRecord((current) => saveRecord(current, true))()}
                    >
                      Salvar mesmo assim
                    </Button>
                  </div>
                </div>
              )}
              {selectedRecordTruck && (
                <p className="text-xs text-on-surface-variant">
                  Odômetro atual do caminhão:{' '}
                  <span className="font-bold text-on-surface">
                    {selectedRecordTruck.current_odometer.toLocaleString('pt-BR')} km
                  </span>
                </p>
              )}
            </div>
            <div className="col-span-2">
              <Controller
                name="notes"
                control={controlRecord}
                render={({ field }) => (
                  <Input
                    ref={notesRef}
                    label="Observações"
                    optional
                    placeholder="Ex: Óleo 5W30 sintético, marca X..."
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={recordErrors.notes?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleRecord(onRecordEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setRecordModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRecord(onRecordSubmit as any)}>Registrar</Button>
          </div>
        </Modal>
      )}

      {/* ── TYPES LIST MODAL ──────────────────────────────────────────────────── */}
      {typesView === 'list' && (
        <Modal title="Tipos de Manutenção" onClose={() => setTypesView(null)}>
          <div className="space-y-2 mb-4">
            {types.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-4">
                Nenhum tipo cadastrado.
              </p>
            ) : (
              <div className="rounded-xl overflow-hidden border border-outline-variant/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-high">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Intervalo
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Rastreio
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Status
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {types.map((type) => (
                      <tr
                        key={type.id}
                        className="hover:bg-surface-bright/5 transition-colors group"
                      >
                        <td className="px-4 py-3 text-sm text-on-surface">{type.name}</td>
                        <td className="px-4 py-3 text-sm text-on-surface">
                          {type.tracks_mileage
                            ? `${type.interval_km.toLocaleString('pt-BR')} km`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={type.tracks_mileage ? 'Afeta KM' : 'Informativo'}
                            color={type.tracks_mileage ? 'blue' : 'gray'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={type.is_active ? 'Ativo' : 'Inativo'}
                            color={type.is_active ? 'green' : 'gray'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openTypeForm(type)}
                              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            {type.is_deletable ? (
                              <button
                                type="button"
                                onClick={() => setDeleteTypeTarget(type)}
                                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                title="Excluir"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => openTypeForm()}>
              <span className="material-symbols-outlined text-base mr-1">add</span>
              Novo Tipo
            </Button>
            <Button variant="ghost" onClick={() => setTypesView(null)}>
              Fechar
            </Button>
          </div>
        </Modal>
      )}

      {/* ── TYPE FORM MODAL ───────────────────────────────────────────────────── */}
      {typesView === 'form' && (
        <Modal
          title={editingType ? 'Editar Tipo' : 'Novo Tipo de Manutenção'}
          onClose={() => setTypesView('list')}
          onEscape={handleTypeEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="name"
                control={controlType}
                render={({ field }) => (
                  <Input
                    ref={nameRef}
                    label="Nome"
                    placeholder="Ex: Troca de Filtro de Ar"
                    value={field.value}
                    onChange={field.onChange}
                    error={typeErrors.name?.message}
                    onKeyDown={(e) => e.key === 'Enter' && descRef.current?.focus()}
                  />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                name="description"
                control={controlType}
                render={({ field }) => (
                  <Input
                    ref={descRef}
                    label="Descrição"
                    optional
                    placeholder="Ex: Troca do filtro de ar do motor"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={typeErrors.description?.message}
                    onKeyDown={(e) => e.key === 'Enter' && intervalRef.current?.focus()}
                  />
                )}
              />
            </div>
            <div className="col-span-2 flex items-start gap-3 rounded-lg bg-surface-container-high/40 p-3">
              <Controller
                name="tracks_mileage"
                control={controlType}
                render={({ field }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value === 1}
                    onClick={() => field.onChange(field.value === 1 ? 0 : 1)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 mt-0.5 ${
                      field.value === 1 ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        field.value === 1 ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              />
              <div>
                <span className="text-sm font-medium text-on-surface">
                  Afeta o controle de quilometragem
                </span>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {typeTracksMileage
                    ? 'Serviços deste tipo (ex: troca de óleo, rodízio de pneus) exigem a quilometragem operacional e reiniciam o intervalo.'
                    : 'Tipo informativo (ex: retrovisor, lanternas, funilaria). Registros não exigem quilometragem e nunca marcam o caminhão como vencido.'}
                </p>
              </div>
            </div>
            {typeTracksMileage && (
              <Controller
                name="interval_km"
                control={controlType}
                render={({ field }) => (
                  <Input
                    ref={intervalRef}
                    label="Intervalo (km)"
                    type="number"
                    placeholder="Ex: 1000"
                    value={field.value}
                    onChange={field.onChange}
                    error={typeErrors.interval_km?.message as string}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleType(onTypeEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            )}
            <div className="flex items-center gap-3">
              <Controller
                name="is_active"
                control={controlType}
                render={({ field }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value === 1}
                    onClick={() => field.onChange(field.value === 1 ? 0 : 1)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                      field.value === 1 ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        field.value === 1 ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              />
              <span className="text-sm text-on-surface-variant">Tipo ativo</span>
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setTypesView('list')}>
              Voltar
            </Button>
            <Button onClick={handleType(onTypeSubmit as any)}>
              {editingType ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM: SAVE ON ENTER ────────────────────────────────────────────── */}
      {pendingRecord && (
        <ConfirmModal
          message="Confirmar o registro desta manutenção?"
          onConfirm={() => saveRecord(pendingRecord)}
          onCancel={() => setPendingRecord(null)}
        />
      )}
      {pendingType && (
        <ConfirmModal
          message={
            editingType ? 'Salvar as alterações deste tipo?' : 'Confirmar a criação deste tipo?'
          }
          onConfirm={() => saveType(pendingType)}
          onCancel={() => setPendingType(null)}
        />
      )}

      {/* ── CONFIRM: DISCARD UNSAVED CHANGES ──────────────────────────────────── */}
      {showRecordDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={() => {
            setShowRecordDiscardConfirm(false)
            setRecordModal(false)
          }}
          onCancel={() => setShowRecordDiscardConfirm(false)}
        />
      )}
      {showTypeDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={() => {
            setShowTypeDiscardConfirm(false)
            setTypesView('list')
          }}
          onCancel={() => setShowTypeDiscardConfirm(false)}
        />
      )}

      {/* ── CONFIRM DELETE RECORD ─────────────────────────────────────────────── */}
      {deleteRecordTarget && (
        <ConfirmModal
          message={`Excluir o registro de "${deleteRecordTarget.type_name}" do caminhão ${deleteRecordTarget.truck_license_plate}? Esta ação não pode ser desfeita.`}
          onConfirm={confirmDeleteRecord}
          onCancel={() => setDeleteRecordTarget(null)}
        />
      )}

      {/* ── CONFIRM DELETE TYPE ───────────────────────────────────────────────── */}
      {deleteTypeTarget && (
        <ConfirmModal
          message={`Excluir o tipo "${deleteTypeTarget.name}"? Todos os registros associados permanecerão no histórico.`}
          onConfirm={confirmDeleteType}
          onCancel={() => setDeleteTypeTarget(null)}
        />
      )}
    </div>
  )
}
