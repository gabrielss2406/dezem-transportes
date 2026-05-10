import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { truckSchema } from '../../../../shared/schemas'
import { Button, Input, Modal, Toast, useToast } from '../../components/ui'
import type { Truck } from '../../lib/types'

const EMPTY = { license_plate: '', model: '', year: '', capacity_ton: '', current_odometer: '' }

export function TrucksPage() {
  const [rows, setRows] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)
  const { toast, show } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<Omit<Truck, 'id'>>({
    resolver: zodResolver(truckSchema),
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const load = useCallback(() => window.api.trucks.list().then(setRows), [])
  useEffect(() => {
    load()
  }, [load])
  const onSubmit = async (data: Omit<Truck, 'id'>) => {
    try {
      if (editing) await window.api.trucks.update(editing.id, data)
      else await window.api.trucks.create(data)
      show(editing ? 'Caminhão atualizado!' : 'Caminhão cadastrado!')
      setModal(false)
      setEditing(null)
      reset()
      load()
    } catch (e: any) {
      show(e.message, 'error')
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
    setValue('license_plate', row.license_plate)
    setValue('model', row.model)
    setValue('year', row.year ? String(row.year) : '')
    setValue('capacity_ton', row.capacity_ton ? String(row.capacity_ton) : '')
    setValue('current_odometer', row.current_odometer ? String(row.current_odometer) : '')
    setModal(true)
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
        <button
          onClick={() => {
            setEditing(null)
            reset()
            setModal(true)
          }}
          className="flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Novo Caminhão
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Caminhões', value: rows.length, icon: 'local_shipping' },
          {
            label: 'Km Acumulado',
            value: rows.reduce((s, r) => s + r.current_odometer, 0).toFixed(0),
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
            <p className="text-4xl font-black font-headline text-on-surface">{value}</p>
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
                  {row.current_odometer.toFixed(0)} km
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
            {rows.length} caminhão{rows.length !== 1 ? 'ões' : ''} cadastrado
            {rows.length !== 1 ? 's' : ''}
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
            <Input
              label="Ano"
              type="number"
              optional
              {...register('year')}
              error={errors.year?.message}
            />
            <Input
              label="Capacidade (ton)"
              type="number"
              optional
              {...register('capacity_ton')}
              error={errors.capacity_ton?.message}
            />
            <div className="col-span-2">
              <Input
                label="Odômetro inicial (km)"
                type="number"
                {...register('current_odometer')}
                error={errors.current_odometer?.message}
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
