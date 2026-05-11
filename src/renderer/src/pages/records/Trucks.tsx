import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { truckSchema } from '../../../../shared/schemas'
import { Button, Input, Modal, Toast, useToast } from '../../components/ui'
import type { Truck } from '../../lib/types'

const EMPTY = { license_plate: '', model: '', year: '', capacity_ton: '', current_odometer: '' }

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
    setValue,
    formState: { errors },
    reset,
    control,
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
  }, [modal])

  const onSubmit = async (data: Omit<Truck, 'id'>) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.trucks.update(editing.id, data)
      } else {
        res = await window.api.trucks.create(data)
      }

      if (res && res.ok === false) {
        const msg = res.errors ? Object.values(res.errors)[0] : 'Erro ao salvar'
        show(String(msg), 'error')
        return
      }

      show(editing ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  async function handleDelete(row: Truck) {
    if (!confirm('Excluir este caminhão?')) return
    await window.api.trucks.delete(row.id)
    show('Caminhão excluído')
    load()
  }

  function edit(row: Truck) {
    setEditing(row)
    reset({
      license_plate: row.license_plate,
      model: row.model,
      year: row.year,
      capacity_ton: row.capacity_ton,
      current_odometer: row.current_odometer,
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
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
            Gestão de Frota
          </span>
          <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface">
            Caminhões
          </h1>
          <p className="text-on-surface-variant mt-2 text-base">
            Gerencie os veículos da sua frota.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              onClick={() => setAppliedFilters(filters)}
              className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-bold text-xs hover:brightness-110 active:scale-95 transition-all ml-1 mr-0.5"
            >
              Filtrar
            </button>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-3 bg-primary text-on-primary px-6 py-3 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Novo Caminhão
          </button>
        </div>
      </div>

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
              {['Placa', 'Modelo', 'Ano', 'Capacidade', 'Odômetro', ''].map((h) => (
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
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum caminhão cadastrado
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
              >
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
                      onClick={() => edit(row)}
                      className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button
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
            <Input
              label="Placa"
              {...register('license_plate')}
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
