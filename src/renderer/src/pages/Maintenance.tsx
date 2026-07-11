import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
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
  const [typesView, setTypesView] = useState<null | 'list' | 'form'>(null)
  const [editingType, setEditingType] = useState<MaintenanceType | null>(null)
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

  const {
    register: regRecord,
    handleSubmit: handleRecord,
    control: controlRecord,
    reset: resetRecord,
    formState: { errors: recordErrors },
  } = useForm<RecordFormData>({
    resolver: zodResolver(maintenanceRecordSchema) as any,
    defaultValues: EMPTY_RECORD,
    mode: 'all',
  })

  const {
    register: regType,
    handleSubmit: handleType,
    control: controlType,
    reset: resetType,
    formState: { errors: typeErrors },
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

  async function saveRecord(data: RecordFormData) {
    const result = await window.api.maintenance.createRecord(data as any)
    if (result?.ok === false) {
      show((result as any).errors?.form || 'Erro ao registrar', 'error')
      return
    }
    show('Manutenção registrada!')
    setRecordModal(false)
    loadStatus()
    if (tab === 'history') {
      loadHistory()
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
            interval_km: type.interval_km,
            is_active: type.is_active,
          }
        : EMPTY_TYPE,
    )
    setTypesView('form')
  }

  async function saveType(data: TypeFormData) {
    let result: any
    if (editingType) {
      result = await window.api.maintenance.updateType(editingType.id, data as any)
    } else {
      result = await window.api.maintenance.createType(data as any)
    }
    if (result?.ok === false) {
      show((result as any).errors?.form || 'Erro ao salvar', 'error')
      return
    }
    show(editingType ? 'Tipo atualizado!' : 'Tipo criado!')
    setTypesView('list')
    loadStatus()
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
    label: `${t.license_plate} — ${t.model}`,
    displayLabel: t.license_plate,
    searchableLabel: `${t.license_plate} ${t.model}`,
  }))

  const typeOptions = activeTypes.map((t) => ({
    value: t.id,
    label: t.name,
  }))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {toast && <Toast {...toast} />}

      <div className="p-8">
        <PageHeader
          title="Manutenção"
          subtitle="Controle de manutenção preventiva"
          actionLabel="Registrar Manutenção"
          onAction={() => openRecord()}
          secondaryActionLabel="Gerenciar Tipos"
          onSecondaryAction={() => setTypesView('list')}
        />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-container-highest/30 p-1 rounded-lg w-fit">
          {(['status', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-surface-container-low text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t === 'status' ? 'Status Geral' : 'Histórico'}
            </button>
          ))}
        </div>

        {/* ── STATUS TAB ────────────────────────────────────────────────────── */}
        {tab === 'status' && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="w-56">
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
              <div className="w-48">
                <Select
                  label="Tipo"
                  optional
                  value={typeFilter}
                  onChange={(v) => setTypeFilter(v === '' ? '' : Number(v))}
                  options={activeTypes.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Todos os tipos"
                />
              </div>
              <div className="w-44">
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
                                className="flex items-center justify-between px-6 py-4 hover:bg-surface-container-highest/20 transition-colors"
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
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="w-56">
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
              <div className="w-48">
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
              <div className="flex-1 min-w-[130px]">
                <Input
                  label="De"
                  type="date"
                  value={histFilters.startDate}
                  onChange={(e) => setHistFilters((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="flex-1 min-w-[130px]">
                <Input
                  label="Até"
                  type="date"
                  value={histFilters.endDate}
                  onChange={(e) => setHistFilters((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl bg-surface-container overflow-hidden border border-outline-variant/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high">
                    {['Data', 'Caminhão', 'Tipo de Manutenção', 'Odômetro', 'Notas', ''].map(
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
                      <td colSpan={6} className="text-center py-12 text-on-surface-variant text-sm">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec, i) => (
                      <tr
                        key={rec.id}
                        className={`hover:bg-surface-bright/10 transition-colors group ${
                          i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-on-surface">
                          {new Date(`${rec.date}T00:00:00`).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="font-mono font-semibold text-on-surface">
                            {rec.truck_license_plate}
                          </span>
                          <span className="text-on-surface-variant ml-1.5">{rec.truck_model}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface">{rec.type_name}</td>
                        <td className="px-6 py-4 text-sm text-on-surface">
                          {rec.odometer_at_service?.toLocaleString('pt-BR')} km
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
      </div>

      {/* ── RECORD MODAL ─────────────────────────────────────────────────────── */}
      {recordModal && (
        <Modal title="Registrar Manutenção" onClose={() => setRecordModal(false)}>
          <form onSubmit={handleRecord(saveRecord)} className="space-y-4">
            <Controller
              name="truck_id"
              control={controlRecord}
              render={({ field }) => (
                <Select
                  label="Caminhão"
                  options={truckOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={recordErrors.truck_id?.message as string}
                />
              )}
            />
            <Controller
              name="maintenance_type_id"
              control={controlRecord}
              render={({ field }) => (
                <Select
                  label="Tipo de Manutenção"
                  options={typeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={recordErrors.maintenance_type_id?.message as string}
                />
              )}
            />
            <DatePicker
              label="Data do Serviço"
              {...regRecord('date')}
              error={recordErrors.date?.message}
            />
            <Input
              label="Odômetro no Serviço (km)"
              type="number"
              placeholder="Ex: 45000"
              {...regRecord('odometer_at_service')}
              error={recordErrors.odometer_at_service?.message as string}
            />
            <Input
              label="Observações"
              optional
              placeholder="Ex: Óleo 5W30 sintético, marca X..."
              {...regRecord('notes')}
              error={recordErrors.notes?.message}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRecordModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar</Button>
            </div>
          </form>
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
              <div className="overflow-hidden rounded-lg border border-outline-variant/10">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-high">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Intervalo
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
                        className="hover:bg-surface-container-highest/20 transition-colors group"
                      >
                        <td className="px-4 py-3 text-sm text-on-surface">{type.name}</td>
                        <td className="px-4 py-3 text-sm text-on-surface">
                          {type.interval_km.toLocaleString('pt-BR')} km
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={type.is_active ? 'Ativo' : 'Inativo'}
                            color={type.is_active ? 'green' : 'gray'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
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
        >
          <form onSubmit={handleType(saveType)} className="space-y-4">
            <Input
              label="Nome"
              placeholder="Ex: Troca de Filtro de Ar"
              {...regType('name')}
              error={typeErrors.name?.message}
            />
            <Input
              label="Descrição"
              optional
              placeholder="Ex: Troca do filtro de ar do motor"
              {...regType('description')}
              error={typeErrors.description?.message}
            />
            <Input
              label="Intervalo (km)"
              type="number"
              placeholder="Ex: 1000"
              {...regType('interval_km')}
              error={typeErrors.interval_km?.message as string}
            />
            <Controller
              name="is_active"
              control={controlType}
              render={({ field }) => (
                <button
                  type="button"
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => field.onChange(field.value === 1 ? 0 : 1)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      field.onChange(field.value === 1 ? 0 : 1)
                    }
                  }}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      field.value === 1 ? 'bg-primary border-primary' : 'border-outline-variant'
                    }`}
                  >
                    {field.value === 1 && (
                      <span className="material-symbols-outlined text-on-primary text-sm">
                        check
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-on-surface select-none">Tipo ativo</span>
                </button>
              )}
            />
            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setTypesView('list')}>
                Voltar
              </Button>
              <Button type="submit">{editingType ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </Modal>
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
    </>
  )
}
