import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { contractorSchema } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { Button, Input, Modal, Toast, useToast } from '../../components/ui'
import type { Contractor } from '../../lib/types'

interface ContractorFormData {
  name: string
  cnpj?: string
  phone?: string
}

const EMPTY: ContractorFormData = {
  name: '',
  cnpj: '',
  phone: '',
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

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function ContractorsPage() {
  const [rows, setRows] = useState<Contractor[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Contractor | null>(null)
  const [filterName, setFilterName] = useState('')
  const [appliedName, setAppliedName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Contractor | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const { toast, show } = useToast()

  const nameRef = useRef<HTMLInputElement>(null)
  const cnpjRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    watch,
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema) as any,
    defaultValues: EMPTY,
    mode: 'all',
  })

  const phoneValue = watch('phone') || ''
  const digits = phoneValue.replace(/\D/g, '')
  const phoneMask =
    digits.length > 10 || (digits.length >= 3 && digits[2] === '9')
      ? '(00) 00000-0000'
      : '(00) 0000-0000'

  const load = useCallback(async () => {
    const data = await window.api.contractors.list(appliedName ? { name: appliedName } : {})
    setRows(data)
  }, [appliedName])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        nameRef.current?.focus()
        if (editing) {
          nameRef.current?.select()
        }
      }, 200)
    } else {
      setEditing(null)
      reset(EMPTY)
    }
  }, [modal, editing, reset])

  const save = async (data: ContractorFormData) => {
    try {
      let res: any
      if (editing) {
        res = await window.api.contractors.update(editing.id, data)
      } else {
        res = await window.api.contractors.create(data)
      }

      if (res && res.ok === false) {
        show('Ocorreu um erro ao salvar.', 'error')
        return
      }

      show(editing ? 'Terceirizado atualizado!' : 'Terceirizado cadastrado!')
      setModal(false)
      load()
    } catch (e: any) {
      show(e.message || 'Erro de conexão', 'error')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    const res = await window.api.contractors.delete(deleteTarget.id)
    if (res.ok === false && res.error) {
      show(res.error, 'error')
    } else {
      show('Terceirizado excluído')
    }
    setDeleteTarget(null)
    load()
  }

  function edit(row: Contractor) {
    setEditing(row)
    reset({ name: row.name, cnpj: row.cnpj ?? '', phone: row.phone ?? '' })
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
      setAppliedName(filterName)
    }
  }

  return (
    <div className="px-6 py-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Gestão de Frota"
        title="Terceirizados"
        subtitle="Gerencie empresas e contratantes que fornecem motoristas e caminhões."
        actionLabel="Novo Terceirizado"
        onAction={() => {
          window.focus()
          setModal(true)
        }}
      >
        <div className="flex items-center bg-surface-container-highest rounded-lg p-1 border border-outline-variant/10 shadow-sm">
          <div className="relative flex items-center h-9">
            <span className="material-symbols-outlined absolute left-3 text-outline text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Nome..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-3 py-2 bg-transparent border-none w-48 focus:ring-0 transition-all placeholder:text-outline/50 text-sm outline-none text-on-surface"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedName(filterName)}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-md font-bold text-xs hover:brightness-110 active:scale-95 transition-all ml-1 mr-0.5"
          >
            Filtrar
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total de Terceirizados', value: rows.length, icon: 'group_add' },
          {
            label: 'Com CNPJ Cadastrado',
            value: rows.filter((r) => r.cnpj).length,
            icon: 'business',
          },
          {
            label: 'Com Telefone',
            value: rows.filter((r) => r.phone).length,
            icon: 'phone',
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
              {['Empresa', 'CNPJ', 'Telefone', ''].map((h) => (
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
                <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Nenhum terceirizado cadastrado
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
                  {row.cnpj || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{row.phone || '—'}</td>
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
            {rows.length} terceirizado{rows.length !== 1 ? 's' : ''} cadastrado
          </p>
        </div>
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Terceirizado' : 'Novo Terceirizado'}
          onClose={() => setModal(false)}
          onEscape={handleEscape}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    ref={nameRef}
                    label="Nome da Empresa"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.name?.message}
                    onKeyDown={(e) => e.key === 'Enter' && cnpjRef.current?.focus()}
                  />
                )}
              />
            </div>
            <Controller
              name="cnpj"
              control={control}
              render={({ field }) => (
                <Input
                  ref={cnpjRef}
                  label="CNPJ"
                  optional
                  mask="00.000.000/0000-00"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.cnpj?.message}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit(save as any)()
                    }
                  }}
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit(save as any)}>Salvar</Button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Excluir "${deleteTarget.name}"? Esta ação não poderá ser desfeita.`}
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
