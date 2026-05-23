import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { routeSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import {
  Badge,
  Button,
  ConfirmModal,
  Input,
  Modal,
  Select,
  type SelectRef,
  Toast,
  useToast,
} from '../components/ui'
import type { Customer, Route } from '../lib/types'

type Waypoint = {
  id: string // Client-side generated ID for dnd-kit
  db_id?: number // Database ID
  name: string
  sequence: number
}

interface RouteFormData {
  name: string
  distance_km: number
  customer_id: number | null
}

const EMPTY: RouteFormData = {
  name: '',
  distance_km: 0,
  customer_id: null,
}

// Componente para um waypoint arrastável
function SortableWaypoint({
  waypoint,
  onRemove,
}: {
  waypoint: Waypoint
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: waypoint.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 border border-outline-variant/20 rounded-lg mb-2 bg-surface-container-lowest flex items-center justify-between gap-2 cursor-grab group/item"
    >
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-sm text-outline opacity-40">
          drag_handle
        </span>
        <span className="text-sm text-on-surface font-medium">{waypoint.name}</span>
      </div>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()} // Importante para não disparar o drag
        onClick={() => onRemove(waypoint.id)}
        className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error/10 rounded-lg transition-all"
        title="Remover ponto"
      >
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
    </li>
  )
}

export function RoutesPage() {
  const [rows, setRows] = useState<Route[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Route | null>(null)
  const [search, setSearch] = useState('')
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [newWaypointName, setNewWaypointName] = useState('')
  const [pendingData, setPendingData] = useState<RouteFormData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const { toast, show } = useToast()
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor))

  // Refs para navegação por teclado
  const nameRef = useRef<HTMLInputElement>(null)
  const customerSelectRef = useRef<SelectRef>(null)
  const distanceRef = useRef<HTMLInputElement>(null)

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
  } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema) as any,
    defaultValues: { ...EMPTY },
    mode: 'all',
  })

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        (window as any).api.routes.list(search),
        window.api.customers.list(),
      ])
      setRows(r)
      setCustomers(c)
    } catch (e: any) {
      show(e.message || 'Erro ao carregar dados', 'error')
    }
  }, [search, show])

  const loadWaypoints = useCallback(
    async (routeId: number) => {
      try {
        const data: { id: number; name: string; sequence: number }[] = await (
          window as any
        ).api.routes.getWaypoints(routeId)
        setWaypoints(
          data.map((wp) => ({
            id: crypto.randomUUID(),
            db_id: wp.id,
            name: wp.name,
            sequence: wp.sequence,
          })),
        )
      } catch (e: any) {
        show('Erro ao carregar pontos de parada', 'error')
      }
    },
    [show],
  )

  useEffect(() => {
    load()
  }, [load])

  // Foco inicial e limpeza
  useEffect(() => {
    if (modal) {
      setTimeout(() => {
        window.focus()
        nameRef.current?.focus()
      }, 200)
    } else {
      setEditing(null)
      reset({ ...EMPTY })
      setWaypoints([])
      setNewWaypointName('')
    }
  }, [modal, reset])

  const save = async (data: RouteFormData) => {
    try {
      let routeId: number
      if (editing) {
        await (window as any).api.routes.update({ ...data, id: editing.id })
        routeId = editing.id
      } else {
        const res = await (window as any).api.routes.create(data)
        routeId = res.id
      }

      // Salvar waypoints
      await (window as any).api.routes.updateWaypoints({
        route_id: routeId,
        waypoints: waypoints.map((wp, index) => ({ name: wp.name, sequence: index })),
      })

      show(editing ? 'Rota atualizada!' : 'Rota cadastrada!')
      setModal(false)
      setPendingData(null)
      load()
    } catch (e: any) {
      setPendingData(null)
      show(e.message || 'Erro ao salvar', 'error')
    }
  }

  const onSubmit = (data: RouteFormData) => {
    save(data)
  }

  const onEnterSubmit = (data: RouteFormData) => {
    setPendingData(data)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return
    }
    await (window as any).api.routes.delete(deleteTarget.id)
    show('Rota excluída')
    setDeleteTarget(null)
    load()
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

  function edit(row: Route) {
    setEditing(row)
    reset({
      name: row.name,
      distance_km: row.distance_km || 0,
      customer_id: row.customer_id ?? null,
    })
    loadWaypoints(row.id)
    setModal(true)
  }

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setWaypoints((items) => {
        const oldIndex = items.findIndex((wp) => wp.id === active.id)
        const newIndex = items.findIndex((wp) => wp.id === over.id)
        return arrayMove(items, oldIndex, newIndex).map((wp, index) => ({ ...wp, sequence: index }))
      })
    }
  }, [])

  const addWaypoint = () => {
    if (newWaypointName.trim()) {
      setWaypoints((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: newWaypointName.trim(),
          sequence: prev.length,
        },
      ])
      setNewWaypointName('')
    }
  }

  const removeWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== id))
  }

  return (
    <div className="p-12 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <PageHeader
        pretitle="Logística"
        title="Rotas"
        subtitle="Gerencie trajetos recorrentes e seus pontos de parada."
        actionLabel="Nova Rota"
        onAction={() => {
          window.focus()
          setModal(true)
        }}
      >
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar rota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                load()
              }
            }}
            className="pl-11 pr-4 py-3 bg-surface-container-highest border-none rounded-lg w-64 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/60 text-sm outline-none text-on-surface"
          />
        </div>
      </PageHeader>

      {/* Table */}
      <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              {['Nome da Rota', 'Cliente', 'Distância', 'Pontos', ''].map((h) => (
                <th
                  key={h}
                  className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant text-sm">
                  Nenhuma rota encontrada
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-primary/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary-container/10 flex items-center justify-center text-secondary shrink-0">
                      <span className="material-symbols-outlined text-lg">route</span>
                    </div>
                    <span className="font-bold text-on-surface font-headline text-sm">
                      {row.name}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm text-on-surface font-medium">
                      {row.customer_name ?? '—'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <Badge label={`${row.distance_km} km`} color="blue" />
                </td>
                <td className="px-8 py-5">
                  <span className="text-xs text-on-surface-variant font-bold">Trajeto Padrão</span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>

      {modal && (
        <Modal
          title={editing ? 'Editar Rota' : 'Nova Rota'}
          onClose={() => setModal(false)}
          onEscape={handleEscape}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      ref={nameRef}
                      label="Nome da Rota"
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.name?.message}
                      onKeyDown={(e) => e.key === 'Enter' && customerSelectRef.current?.open()}
                    />
                  )}
                />
              </div>

              <Controller
                name="customer_id"
                control={control}
                render={({ field }) => (
                  <Select
                    ref={customerSelectRef}
                    label="Cliente"
                    optional
                    icon="business"
                    value={field.value}
                    onChange={field.onChange}
                    onEnterSelect={() => distanceRef.current?.focus()}
                    error={errors.customer_id?.message}
                    options={customers.map((c) => ({
                      value: c.id,
                      label: (
                        <div className="flex justify-between">
                          <span>{c.name}</span>
                          {c.customId && (
                            <span className="text-on-surface-variant/50">#{c.customId}</span>
                          )}
                        </div>
                      ),
                      displayLabel: c.name,
                      searchableLabel: `${c.name} ${c.customId || ''}`,
                    }))}
                  />
                )}
              />

              <Controller
                name="distance_km"
                control={control}
                render={({ field }) => (
                  <Input
                    ref={distanceRef}
                    label="Distância (km)"
                    type="number"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.distance_km?.message}
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

            {/* Waypoints */}
            <div className="border-t border-outline-variant/10 pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">
                Pontos de Parada (Drag & Drop)
              </h3>

              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Adicionar ponto (ex: Posto, Fazenda...)"
                    value={newWaypointName}
                    onChange={(e) => setNewWaypointName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWaypoint()}
                  />
                </div>
                <button
                  type="button"
                  onClick={addWaypoint}
                  className="bg-surface-container-highest text-on-surface px-4 rounded-lg font-bold text-sm hover:bg-primary hover:text-on-primary transition-all"
                >
                  Add
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto pr-2">
                {waypoints.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-outline-variant/20 rounded-xl text-on-surface-variant text-sm italic">
                    Nenhum ponto de parada adicionado
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={waypoints.map((wp) => wp.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul>
                        {waypoints.map((wp) => (
                          <SortableWaypoint key={wp.id} waypoint={wp} onRemove={removeWaypoint} />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit(onSubmit as any)}>Salvar Rota</Button>
            </div>
          </div>
        </Modal>
      )}

      {pendingData && (
        <ConfirmModal
          message="Tem certeza que deseja cadastrar esta rota?"
          onConfirm={() => save(pendingData)}
          onCancel={() => setPendingData(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message="Excluir esta rota?"
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
