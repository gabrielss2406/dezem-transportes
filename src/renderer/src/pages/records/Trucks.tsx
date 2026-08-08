import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { truckSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Contractor, Truck } from '../../lib/types'

interface TruckFormData {
  license_plate: string
  model?: string
  year: number | null
  capacity_ton: number | null
  current_odometer: number
  customId?: number
  is_outsourced: number
  contractor_id: number | null
}

const EMPTY: TruckFormData = {
  license_plate: '',
  model: '',
  year: null,
  capacity_ton: null,
  current_odometer: 0,
  customId: undefined,
  is_outsourced: 0,
  contractor_id: null,
}

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setTimeout(() => confirmBtnRef.current?.focus(), 50)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-6">
        <p className="text-sm text-on-surface">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button ref={confirmBtnRef} onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TrucksPage() {
  const [rows, setRows] = useState<Truck[]>([])
  const [allTrucks, setAllTrucks] = useState<Truck[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)
  const [view, setView] = useState<'internal' | 'outsourced'>('internal')
  const [filters, setFilters] = useState({ license_plate: '', capacity_ton: '' })
  const [appliedFilters, setAppliedFilters] = useState({ license_plate: '', capacity_ton: '' })
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Truck | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  const customIdRef = useRef<HTMLInputElement>(null)
  const plateRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  const capacityRef = useRef<HTMLInputElement>(null)
  const odometerRef = useRef<HTMLInputElement>(null)
  const contractorSelectRef = useRef<any>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    setValue,
    watch,
    setError,
  } = useForm<TruckFormData>({
    resolver: zodResolver(truckSchema) as any,
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const isOutsourcedValue = watch('is_outsourced')

  const load = useCallback(async () => {
    const listFilters = {
      ...appliedFilters,
      is_outsourced: view === 'outsourced',
    }
    const [t, c, all] = await Promise.all([
      window.api.trucks.list(listFilters),
      window.api.contractors.list(),
      window.api.trucks.list({}),
    ])
    setRows(t)
    setContractors(c)
    setAllTrucks(all)
  }, [appliedFilters, view])

  useEffect(() => {
    load()
  }, [load])

  const findNextAvailableId = useCallback(() => {
    const usedIds = new Set(allTrucks.map((r) => r.customId).filter((id): id is number => !!id))
    let nextId = 1
    while (usedIds.has(nextId)) {
      nextId++
    }
    return nextId
  }, [allTrucks])

  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        if (!editing) {
          const nextId = findNextAvailableId()
          const formData: TruckFormData = {
            ...EMPTY,
            customId: nextId,
            is_outsourced: view === 'outsourced' ? 1 : 0,
          }
          reset(formData)
          setTimeout(() => {
            plateRef.current?.focus()
          }, 50)
        } else {
          customIdRef.current?.focus()
        }
      }, 200)
    } else {
      setEditing(null)
      reset(EMPTY)
    }
  }, [modal, editing, reset, findNextAvailableId, view])

  const save = async (data: TruckFormData) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.trucks.update(editing.id, data as any)
      } else {
        res = await window.api.trucks.create(data as any)
      }

      if (res && res.ok === false) {
        setPendingData(null)
        if (res.errors) {
          for (const [field, message] of Object.entries(res.errors)) {
            if (field === 'form') {
              show(message as string, 'error')
            } else {
              let finalMessage = message as string
              if (field === 'customId' && finalMessage.toLowerCase().includes('uso')) {
                const suggestion = findNextAvailableId()
                finalMessage = `${finalMessage}. Sugestão: ${suggestion}`
              }
              setError(field as any, { type: 'manual', message: finalMessage })
            }
          }
        } else {
          show('Ocorreu um erro ao salvar.', 'error')
        }
        return
      }

      show(editing ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
      setModal(false)
      setPendingData(null)
      await load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  const onSubmit = (data: TruckFormData) => save(data)
  const onEnterSubmit = (data: TruckFormData) => setPendingData(data)

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await window.api.trucks.delete(deleteTarget.id)
    show('Caminhão excluído')
    setDeleteTarget(null)
    load()
  }

  function formatPlate(raw: string): string {
    const clean = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 7)
    if (clean.length >= 5 && /[0-9]/.test(clean[4])) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`
    }
    return clean
  }

  function edit(row: Truck) {
    setEditing(row)
    reset({
      license_plate: formatPlate(row.license_plate),
      model: row.model,
      year: row.year ?? null,
      capacity_ton: row.capacity_ton ?? null,
      current_odometer: row.current_odometer,
      customId: row.customId ?? undefined,
      is_outsourced: row.is_outsourced ?? 0,
      contractor_id: row.contractor_id ?? null,
    })
    setModal(true)
  }

  const handleEscape = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      setModal(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setAppliedFilters(filters)
    }
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão de Frota"
        title="Caminhões"
        subtitle={
          view === 'internal'
            ? 'Veículos da frota própria da empresa.'
            : 'Veículos fornecidos por terceiros.'
        }
        actionLabel={view === 'internal' ? 'Novo Caminhão' : 'Novo Caminhão Terceirizado'}
        onAction={() => {
          window.focus()
          setModal(true)
        }}
      >
        <div className="flex items-center bg-surface-container-highest rounded-lg p-1 border border-outline-variant/10 shadow-sm">
          <div className="relative flex items-center h-9">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
              badge
            </span>
            <input
              type="text"
              placeholder="Placa..."
              value={filters.license_plate}
              onChange={(e) => setFilters((f) => ({ ...f, license_plate: e.target.value }))}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-48 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <div className="w-[1px] bg-outline-variant/20 h-6 mx-1" />
          <div className="relative flex items-center h-9">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
              scale
            </span>
            <input
              type="number"
              placeholder="Capac. mín..."
              value={filters.capacity_ton}
              onChange={(e) => setFilters((f) => ({ ...f, capacity_ton: e.target.value }))}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-48 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedFilters(filters)}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-bold text-xs hover:brightness-110 active:scale-95 transition-all ml-1 mr-0.5"
          >
            Filtrar
          </button>
        </div>
      </PageHeader>

      {/* View tabs */}
      <div className="flex gap-1 mb-8 bg-surface-container-high rounded-lg p-1 w-fit border border-outline-variant/10">
        <button
          type="button"
          onClick={() => setView('internal')}
          className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${
            view === 'internal'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1.5">
            local_shipping
          </span>
          Próprios
        </button>
        <button
          type="button"
          onClick={() => setView('outsourced')}
          className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${
            view === 'outsourced'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1.5">group_add</span>
          Terceirizados
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {(view === 'internal'
          ? [
              { label: 'Total de Caminhões', value: rows.length, icon: 'local_shipping' },
              {
                label: 'Km Acumulado',
                value: rows.reduce((s, r) => s + (r.current_odometer || 0), 0).toFixed(0),
                icon: 'route',
              },
              {
                label: 'Capacidade Total',
                value: `${Number(rows.reduce((s, r) => s + (r.capacity_ton ?? 0), 0).toFixed(4))} ton`,
                icon: 'scale',
              },
            ]
          : [
              { label: 'Caminhões Terceirizados', value: rows.length, icon: 'group_add' },
              {
                label: 'Empresas Distintas',
                value: new Set(rows.map((r) => r.contractor_id).filter(Boolean)).size,
                icon: 'business',
              },
              {
                label: 'Capacidade Total',
                value: `${Number(rows.reduce((s, r) => s + (r.capacity_ton ?? 0), 0).toFixed(4))} ton`,
                icon: 'scale',
              },
            ]
        ).map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-surface-container-low p-6 rounded-lg relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-6xl text-primary">{icon}</span>
            </div>
            <p className="text-on-surface-variant text-sm mb-1">{label}</p>
            <p className="text-3xl font-black font-headline text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {[
                'ID',
                'Placa',
                'Modelo',
                'Ano',
                'Capacidade',
                view === 'internal' ? 'Odômetro' : 'Empresa',
                '',
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  {view === 'internal'
                    ? 'Nenhum caminhão próprio cadastrado'
                    : 'Nenhum caminhão terceirizado cadastrado'}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
              >
                <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">
                  {row.customId || '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-surface-container-lowest rounded flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-sm">
                        local_shipping
                      </span>
                    </div>
                    <span className="font-mono font-bold text-primary text-sm">
                      {row.license_plate}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-on-surface">{row.model || '—'}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.year || '—'}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {row.capacity_ton ? `${row.capacity_ton} ton` : '—'}
                </td>
                <td className="px-6 py-4 text-sm">
                  {view === 'internal' ? (
                    <span className="font-mono text-on-surface-variant">
                      {Number(row.current_odometer || 0).toFixed(0)} km
                    </span>
                  ) : (
                    <span className="text-on-surface-variant">{row.contractor_name || '—'}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => edit(row)}
                      className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(row)}
                      className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-4 bg-surface-container-high/50 border-t border-outline-variant/10">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            {rows.length} caminh{rows.length !== 1 ? 'ões' : 'ão'}{' '}
            {view === 'outsourced' ? 'terceirizado' : 'próprio'}
            {rows.length !== 1 ? 's' : ''} cadastrado
          </p>
        </div>
      </div>

      {modal && (
        <Modal
          title={
            editing
              ? 'Editar Caminhão'
              : view === 'outsourced'
                ? 'Novo Caminhão Terceirizado'
                : 'Novo Caminhão'
          }
          onClose={() => setModal(false)}
          onEscape={handleEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="customId"
                control={control}
                render={({ field }) => (
                  <Input
                    ref={customIdRef}
                    label="ID Personalizado"
                    type="number"
                    optional
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.customId?.message}
                    onKeyDown={(e) => e.key === 'Enter' && plateRef.current?.focus()}
                  />
                )}
              />
            </div>
            <Controller
              name="license_plate"
              control={control}
              render={({ field }) => (
                <Input
                  ref={plateRef}
                  label="Placa"
                  value={field.value}
                  onChange={(e) => {
                    const formatted = formatPlate(e.target.value)
                    setValue('license_plate', formatted, { shouldValidate: true })
                  }}
                  error={errors.license_plate?.message}
                  placeholder="ABC-1234"
                  onKeyDown={(e) => e.key === 'Enter' && modelRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="model"
              control={control}
              render={({ field }) => (
                <Input
                  ref={modelRef}
                  label="Modelo"
                  optional
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.model?.message}
                  onKeyDown={(e) => e.key === 'Enter' && yearRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="year"
              control={control}
              render={({ field }) => (
                <Input
                  ref={yearRef}
                  label="Ano"
                  type="number"
                  optional
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.year?.message}
                  onKeyDown={(e) => e.key === 'Enter' && capacityRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="capacity_ton"
              control={control}
              render={({ field }) => (
                <Input
                  ref={capacityRef}
                  label="Capacidade (ton)"
                  type="number"
                  optional
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.capacity_ton?.message}
                  onKeyDown={(e) => e.key === 'Enter' && odometerRef.current?.focus()}
                />
              )}
            />
            <div className="col-span-2">
              <Controller
                name="current_odometer"
                control={control}
                render={({ field }) => (
                  <Input
                    ref={odometerRef}
                    label="Odômetro (km)"
                    type="number"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.current_odometer?.message}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSubmit(onEnterSubmit as any)()
                      }
                    }}
                  />
                )}
              />
            </div>

            {/* Outsourced toggle */}
            <div className="col-span-2 flex items-center gap-3 py-1">
              <Controller
                name="is_outsourced"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value === 1}
                    onClick={() => {
                      const next = field.value === 1 ? 0 : 1
                      field.onChange(next)
                      if (next === 0) {
                        setValue('contractor_id', null)
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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
              <span className="text-sm text-on-surface-variant">Caminhão terceirizado</span>
            </div>

            {isOutsourcedValue === 1 && (
              <div className="col-span-2">
                <Controller
                  name="contractor_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      ref={contractorSelectRef}
                      label="Empresa Terceirizada"
                      optional
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.contractor_id?.message}
                      options={contractors.map((c) => ({
                        value: c.id,
                        label: c.name,
                        displayLabel: c.name,
                        searchableLabel: c.name,
                      }))}
                    />
                  )}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit as any)}>Salvar</Button>
          </div>
        </Modal>
      )}

      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja cadastrar este caminhão?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este caminhão?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={() => {
            setShowDiscardConfirm(false)
            setModal(false)
          }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  )
}
