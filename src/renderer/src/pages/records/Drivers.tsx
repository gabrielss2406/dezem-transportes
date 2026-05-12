import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { driverSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, CurrencyInput, Input, Modal, Select, Toast, useToast } from '../../components/ui'
import type { Driver, Truck } from '../../lib/types'
import { formatBRL } from '../../lib/utils'

const EMPTY = { name: '', cpf: '', phone: '', monthly_salary: '', truck_id: '' }

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function DriversPage() {
  const [rows, setRows] = useState<Driver[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [filters, setFilters] = useState({ name: '', cpf: '', truck_id: '' })
  const [appliedFilters, setAppliedFilters] = useState({ name: '', cpf: '', truck_id: '' })
  const { toast, show } = useToast()

  const FORM_EMPTY = { ...EMPTY, monthly_salary: 0, truck_id: null }

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<Omit<Driver, 'id'>>({
    resolver: zodResolver(driverSchema),
    defaultValues: FORM_EMPTY,
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

  // Limpeza automática ao fechar o modal
  useEffect(() => {
    if (!modal) {
      setEditing(null)
      reset(FORM_EMPTY)
    }
  }, [modal])

  const onSubmit = async (data: Omit<Driver, 'id'>) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.drivers.update(editing.id, data)
      } else {
        res = await window.api.drivers.create(data)
      }

      if (res && res.ok === false) {
        const msg = res.errors ? Object.values(res.errors)[0] : 'Erro ao salvar dados'
        show(String(msg), 'error')
        return
      }

      show(editing ? 'Motorista atualizado!' : 'Motorista cadastrado!')
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  async function handleDelete(row: Driver) {
    if (!confirm('Excluir este motorista?')) return
    await window.api.drivers.delete(row.id)
    show('Motorista excluído')
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
        title="Motoristas"
        subtitle="Gerencie os motoristas vinculados à frota."
        actionLabel="Novo Motorista"
        onAction={() => setModal(true)}
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
              options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))}
              optional
              className="scale-90 origin-left"
            />
          </div>
          <button
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
              {['Nome', 'CPF', 'Telefone', 'Salário', 'Caminhão', ''].map((h) => (
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
                  Nenhum motorista cadastrado
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
            {rows.length} motorista{rows.length !== 1 ? 's' : ''} cadastrado
          </p>
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Motorista' : 'Novo Motorista'}
          onClose={() => setModal(false)}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome" {...register('name')} error={errors.name?.message} />
            </div>
            <Input
              label="CPF"
              optional
              mask="000.000.000-00"
              {...register('cpf')}
              error={errors.cpf?.message}
            />
            <Input
              label="Telefone"
              optional
              mask={phoneMask}
              {...register('phone')}
              error={errors.phone?.message}
            />
            <Controller
              name="monthly_salary"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label="Salário mensal"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.monthly_salary?.message}
                />
              )}
            />
            <Controller
              name="truck_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Caminhão vinculado"
                  optional
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.truck_id?.message}
                  options={trucks.map((t) => ({ value: t.id, label: t.license_plate }))}
                />
              )}
            />
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
