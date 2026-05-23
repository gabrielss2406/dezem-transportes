import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { driverSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, CurrencyInput, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Driver, Truck } from '../../lib/types'
import { formatBRL } from '../../lib/utils'

interface DriverFormData {
  name: string
  cpf?: string
  phone?: string
  monthly_salary: number
  truck_id: number | null
  customId?: number
}

const EMPTY_VALUES: DriverFormData = {
  name: '',
  cpf: '',
  phone: '',
  monthly_salary: 0,
  truck_id: null,
  customId: undefined,
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Modal de confirmação próprio — sem confirm() nativo do Electron
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

export function DriversPage() {
  const [rows, setRows] = useState<Driver[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [filters, setFilters] = useState({ name: '', cpf: '', truck_id: '' })
  const [appliedFilters, setAppliedFilters] = useState({ name: '', cpf: '', truck_id: '' })
  const [pendingData, setPendingData] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  const nameRef = useRef<HTMLInputElement>(null)
  const cpfRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const salaryRef = useRef<HTMLInputElement>(null)
  const truckSelectRef = useRef<any>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    control,
    setValue,
    setError,
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema) as any,
    defaultValues: EMPTY_VALUES,
    mode: 'all',
  })

  const phoneValue = watch('phone') || ''
  const digits = phoneValue.replace(/\D/g, '')
  const phoneMask =
    digits.length > 10 || (digits.length >= 3 && digits[2] === '9')
      ? '(00) 00000-0000'
      : '(00) 0000-0000'

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([
      window.api.drivers.list(appliedFilters),
      window.api.trucks.list(),
    ])
    setRows(d)
    setTrucks(t)
  }, [appliedFilters])

  useEffect(() => {
    load()
  }, [load])

  const findNextAvailableId = useCallback(() => {
    const usedIds = new Set(rows.map((r) => r.customId).filter((id): id is number => !!id))
    let nextId = 1
    while (usedIds.has(nextId)) {
      nextId++
    }
    return nextId
  }, [rows])

  // Foco inteligente e sugestão de ID
  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        if (!editing) {
          const nextId = findNextAvailableId()
          setValue('customId', nextId as any, { shouldValidate: false })
          nameRef.current?.focus()
        } else {
          nameRef.current?.focus()
          nameRef.current?.select()
        }
      }, 200)
    } else {
      setEditing(null)
      reset(EMPTY_VALUES)
    }
  }, [modal, editing, reset, setValue, findNextAvailableId])

  const save = async (data: DriverFormData) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.drivers.update(editing.id, data as any)
      } else {
        res = await window.api.drivers.create(data as any)
      }

      if (res && res.ok === false) {
        setPendingData(null)
        if (res.errors) {
          for (const [field, message] of Object.entries(res.errors)) {
            let finalMessage = message as string
            if (field === 'customId' && finalMessage.toLowerCase().includes('uso')) {
              finalMessage = `${finalMessage}. Sugestão: ${findNextAvailableId()}`
            }
            setError(field as any, {
              type: 'manual',
              message: finalMessage,
            })
          }
        } else {
          show('Ocorreu um erro ao salvar.', 'error')
        }
        return
      }

      show(editing ? 'Motorista atualizado!' : 'Motorista cadastrado!')
      setModal(false)
      setPendingData(null)
      load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  const onSubmit = (data: DriverFormData) => {
    save(data)
  }

  const onEnterSubmit = (data: DriverFormData) => {
    setPendingData(data)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await window.api.drivers.delete(deleteTarget.id)
    show('Motorista excluído')
    setDeleteTarget(null)
    load()
  }

  function edit(row: Driver) {
    setEditing(row)
    reset({
      name: row.name,
      cpf: row.cpf ?? '',
      phone: row.phone ?? '',
      monthly_salary: row.monthly_salary,
      truck_id: row.truck_id,
      customId: row.customId ?? undefined,
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

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false)
    setModal(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setAppliedFilters(filters)
    }
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <PageHeader
        pretitle="Gestão de Frota"
        title="Motoristas"
        subtitle="Gerencie os motoristas vinculados à frota."
        actionLabel="Novo Motorista"
        onAction={() => {
          window.focus()
          setModal(true)
        }}
      >
        <div className="flex items-center bg-surface-container-highest rounded-lg p-1 border border-outline-variant/10 shadow-sm">
          <div className="relative flex items-center h-9">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
              person
            </span>
            <input
              type="text"
              placeholder="Nome..."
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-32 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <div className="w-[1px] bg-outline-variant/20 h-6 mx-1" />
          <div className="relative flex items-center h-9">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
              badge
            </span>
            <input
              type="text"
              placeholder="CPF..."
              value={filters.cpf}
              onChange={(e) => setFilters((f) => ({ ...f, cpf: e.target.value }))}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-32 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <div className="w-[1px] bg-outline-variant/20 h-6 mx-1" />
          <div className="w-36">
            <Select
              placeholder="Caminhão"
              value={filters.truck_id}
              onChange={(val) => setFilters((f) => ({ ...f, truck_id: val }))}
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
              className="scale-90 origin-left"
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Motoristas', value: rows.length, icon: 'badge' },
          {
            label: 'Com Caminhão Vinculado',
            value: rows.filter((r) => r.truck_id).length,
            icon: 'local_shipping',
          },
          {
            label: 'Folha Mensal',
            value: formatBRL(rows.reduce((s, r) => s + r.monthly_salary, 0)),
            icon: 'payments',
          },
        ].map(({ label, value, icon }) => (
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
              {['ID', 'Nome', 'CPF', 'Telefone', 'Salário', 'Caminhão', ''].map((h) => (
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
                  Nenhum motorista cadastrado
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
                    <div className="w-9 h-9 rounded bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center text-[10px] font-bold text-on-surface-variant shrink-0">
                      {initials(row.name)}
                    </div>
                    <span className="font-bold text-on-surface text-sm">{row.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">
                  {row.cpf || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.phone || '—'}</td>
                <td className="px-6 py-4 text-sm font-medium text-primary">
                  {formatBRL(row.monthly_salary)}
                </td>
                <td className="px-6 py-4">
                  {row.truck_license_plate ? (
                    <span className="font-mono font-bold text-primary text-sm">
                      {row.truck_license_plate}
                    </span>
                  ) : (
                    <span className="text-on-surface-variant text-sm">—</span>
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
            {rows.length} motorista{rows.length !== 1 ? 's' : ''} cadastrado
          </p>
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Motorista' : 'Novo Motorista'}
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
                    label="ID Personalizado"
                    type="number"
                    optional
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.customId?.message}
                    onKeyDown={(e) => e.key === 'Enter' && nameRef.current?.focus()}
                  />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    ref={nameRef}
                    label="Nome"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.name?.message}
                    onKeyDown={(e) => e.key === 'Enter' && cpfRef.current?.focus()}
                  />
                )}
              />
            </div>
            <Controller
              name="cpf"
              control={control}
              render={({ field }) => (
                <Input
                  ref={cpfRef}
                  label="CPF"
                  optional
                  mask="000.000.000-00"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.cpf?.message}
                  onKeyDown={(e) => e.key === 'Enter' && phoneRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input
                  ref={phoneRef}
                  label="Telefone"
                  optional
                  mask={phoneMask}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                  onKeyDown={(e) => e.key === 'Enter' && salaryRef.current?.focus()}
                />
              )}
            />
            <Controller
              name="monthly_salary"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  ref={salaryRef}
                  label="Salário mensal"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.monthly_salary?.message}
                  onKeyDown={(e) => e.key === 'Enter' && truckSelectRef.current?.open()}
                />
              )}
            />
            <Controller
              name="truck_id"
              control={control}
              render={({ field }) => (
                <Select
                  ref={truckSelectRef}
                  label="Caminhão vinculado"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.truck_id?.message}
                  onEnterSelect={() => handleSubmit(onEnterSubmit as any)()}
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
          message="Tem certeza que deseja cadastrar este motorista?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir este motorista?"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showDiscardConfirm && (
        <ConfirmModal
          message="Existem alterações não salvas. Deseja realmente fechar?"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  )
}
