import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { truckSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Toast, useToast } from '../../components/ui'
import type { Truck } from '../../lib/types'

const EMPTY = {
  license_plate: '',
  model: '',
  year: '',
  capacity_ton: '',
  current_odometer: '',
  customId: undefined,
}

export function TrucksPage() {
  const [rows, setRows] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)
  const [filters, setFilters] = useState({ license_plate: '', capacity_ton: '' })
  const [appliedFilters, setAppliedFilters] = useState({ license_plate: '', capacity_ton: '' })
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    setError,
  } = useForm<Omit<Truck, 'id'>>({
    resolver: zodResolver(truckSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const load = useCallback(() => {
    return window.api.trucks.list(appliedFilters).then(setRows)
  }, [appliedFilters])
  useEffect(() => {
    load()
  }, [load])

  // Limpeza automática ao fechar o modal
  useEffect(() => {
    if (!modal) {
      setEditing(null)
      reset(EMPTY)
    }
  }, [modal, reset])

  const onSubmit = async (data: Omit<Truck, 'id'>) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.trucks.update(editing.id, data)
      } else {
        res = await window.api.trucks.create(data)
      }

      if (res && res.ok === false) {
        if (res.errors) {
          for (const [field, message] of Object.entries(res.errors)) {
            if (field === 'form') {
              show(message as string, 'error')
            } else {
              setError(field as keyof Omit<Truck, 'id'>, {
                type: 'manual',
                message: message as string,
              })
            }
          }
        } else {
          show('Ocorreu um erro ao salvar.', 'error')
        }
        return
      }

      show(editing ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
      setModal(false)
      await load()
    } catch (e: any) {
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  async function handleDelete(row: Truck) {
    if (!confirm('Excluir este caminhão?')) {
      return
    }
    await window.api.trucks.delete(row.id)
    show('Caminhão excluído')
    load()
  }

  function formatPlate(raw: string): string {
    const clean = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 7)
    // Only add dash for old format (ABC-1234): 5th char is a digit
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
      year: row.year,
      capacity_ton: row.capacity_ton,
      current_odometer: row.current_odometer,
      customId: row.customId ?? undefined,
    })
    setModal(true)
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
        title="Caminhões"
        subtitle="Gerencie os veículos da sua frota."
        actionLabel="Novo Caminhão"
        onAction={() => setModal(true)}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Caminhões', value: rows.length, icon: 'local_shipping' },
          {
            label: 'Km Acumulado',
            value: rows.reduce((s, r) => s + (r.current_odometer || 0), 0).toFixed(0),
            icon: 'route',
          },
          {
            label: 'Capacidade Total',
            value: `${rows.reduce((s, r) => s + (r.capacity_ton ?? 0), 0).toFixed(0)} ton`,
            icon: 'scale',
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
              {['ID', 'Placa', 'Modelo', 'Ano', 'Capacidade', 'Odômetro', ''].map((h) => (
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
                  Nenhum caminhão cadastrado
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
                <td className="px-6 py-4 text-sm text-on-surface">{row.model}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.year || '—'}</td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">
                  {row.capacity_ton ? `${row.capacity_ton} ton` : '—'}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-on-surface-variant">
                  {Number(row.current_odometer || 0).toFixed(0)} km
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
                      onClick={() => handleDelete(row)}
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
            {rows.length} caminh{rows.length !== 1 ? 'ões' : 'ão'} cadastrado
          </p>
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Caminhão' : 'Novo Caminhão'}
          onClose={() => setModal(false)}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="ID Personalizado"
                type="number"
                optional
                {...register('customId')}
                error={errors.customId?.message}
              />
            </div>
            <Input
              label="Placa"
              {...register('license_plate', {
                onChange: (e) => {
                  const formatted = formatPlate(e.target.value)
                  setValue('license_plate', formatted, { shouldValidate: true })
                },
              })}
              error={errors.license_plate?.message}
              placeholder="ABC-1234"
            />
            <Input label="Modelo" {...register('model')} error={errors.model?.message} />
            <Controller
              name="year"
              control={control}
              render={({ field }) => (
                <Input
                  label="Ano"
                  type="number"
                  optional
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.year?.message}
                />
              )}
            />
            <Controller
              name="capacity_ton"
              control={control}
              render={({ field }) => (
                <Input
                  label="Capacidade (ton)"
                  type="number"
                  optional
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.capacity_ton?.message}
                />
              )}
            />
            <div className="col-span-2">
              <Controller
                name="current_odometer"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Odômetro (km)"
                    type="number"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    error={errors.current_odometer?.message}
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(onSubmit)}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
