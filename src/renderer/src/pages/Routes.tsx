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
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { routeSchema } from '../../../shared/schemas'
import { PageHeader } from '../components/PageHeader'
import { cn } from '../lib/utils'

type Waypoint = {
  id: string // Client-side generated ID for dnd-kit
  db_id?: number // Database ID
  name: string
  sequence: number
}

type Route = {
  id: number
  name: string
  distance_km: number
  customer_id: number
  customer_name: string
}

type FormState = z.infer<typeof routeSchema>

const initialFormState: FormState = {
  name: '',
  distance_km: 0,
  customer_id: 0,
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
    zIndex: isDragging ? 10 : 0, // Garante que o item arrastado fique acima
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-2 border border-outline-variant/30 rounded-md mb-1 bg-surface-container-low flex items-center justify-between gap-2 cursor-grab"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm opacity-60">drag_handle</span>
        {waypoint.name}
      </div>
      <button
        type="button"
        onClick={() => onRemove(waypoint.id)}
        className="text-error hover:text-error-container material-symbols-outlined text-sm"
        title="Remover ponto"
      >
        delete
      </button>
    </li>
  )
}

export function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)
  const [formState, setFormState] = useState<Partial<FormState & { id: number }>>(initialFormState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [newWaypointName, setNewWaypointName] = useState('')

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor))

  const loadData = useCallback(async () => {
    try {
      const [routesData, customersData] = await Promise.all([
        (window as any).api.routes.list(),
        (window as any).api.customers.list(),
      ])
      setRoutes(routesData)
      setCustomers(customersData)
    } catch (err: any) {
      toast.error(`Falha ao carregar dados: ${err.message}`)
    }
  }, [])

  const loadWaypoints = useCallback(async (routeId: number) => {
    try {
      const waypointsData: { id: number; name: string; sequence: number }[] = await (
        window as any
      ).api.routes.getWaypoints(routeId)
      setWaypoints(
        waypointsData.map((wp) => ({
          id: crypto.randomUUID(), // Client-side ID
          db_id: wp.id, // Database ID
          name: wp.name,
          sequence: wp.sequence,
        })),
      )
    } catch (err: any) {
      toast.error(`Falha ao carregar pontos de parada: ${err.message}`)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedRouteId) {
      const route = routes.find((r) => r.id === selectedRouteId)
      if (route) {
        setFormState(route)
        setErrors({})
        loadWaypoints(selectedRouteId)
      }
    } else {
      setFormState(initialFormState)
      setErrors({})
      setWaypoints([])
    }
  }, [selectedRouteId, routes, loadWaypoints])

  const handleSelectRoute = (route: Route) => {
    setSelectedRouteId(route.id)
  }

  const handleNew = () => {
    setSelectedRouteId(null)
    setFormState(initialFormState)
    setWaypoints([])
  }

  const validate = () => {
    const result = routeSchema.safeParse(formState)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      for (const error of result.error.errors) {
        newErrors[error.path[0]] = error.message
      }
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Por favor, corrija os erros no formulário.')
      return
    }

    const data = formState as FormState
    try {
      let result: { id: number }
      if ('id' in formState && formState.id) {
        // Update
        result = await (window as any).api.routes.update({ ...data, id: formState.id })
        toast.success('Rota atualizada com sucesso!')
      } else {
        // Create
        result = await (window as any).api.routes.create(data)
        toast.success('Rota criada com sucesso!')
      }
      setSelectedRouteId(result.id) // Seleciona a nova rota

      // Save waypoints after route is created/updated
      await (window as any).api.routes.updateWaypoints({
        route_id: result.id,
        waypoints: waypoints.map((wp, index) => ({ name: wp.name, sequence: index })),
      })
      toast.success('Pontos de parada salvos com sucesso!')

      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    }
  }

  const handleDelete = async () => {
    if ('id' in formState && formState.id) {
      try {
        await (window as any).api.routes.delete(formState.id)
        toast.success('Rota excluída com sucesso!')
        loadData()
        handleNew()
      } catch (err: any) {
        console.error(err)
        toast.error(err.message)
      }
    }
  }

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setWaypoints((items) => {
        const oldIndex = items.findIndex((wp) => wp.id === active.id)
        const newIndex = items.findIndex((wp) => wp.id === over.id)
        return arrayMove(items, oldIndex, newIndex).map((wp, index) => ({ ...wp, sequence: index }))
      })
    }
  }, [])

  const handleAddWaypointFromInput = useCallback(() => {
    if (newWaypointName.trim() !== '') {
      const newWaypoint: Waypoint = {
        id: crypto.randomUUID(), // Usar UUID para garantir unicidade
        name: newWaypointName.trim(),
        sequence: waypoints.length,
      }
      setWaypoints((prev) => [...prev, newWaypoint])
      setNewWaypointName('')
    }
  }, [newWaypointName, waypoints.length])

  const removeWaypoint = useCallback((waypointId: string) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== waypointId))
  }, [])

  return (
    <div className="p-8 h-full flex flex-col">
      <PageHeader
        title="Rotas"
        description="Gerencie as rotas de entrega para cada cliente e seus pontos de parada."
      />
      <div className="flex gap-4 mt-8 flex-1">
        {/* Coluna 1: Lista de Rotas */}
        <div className="w-1/3 bg-surface-container-lowest p-4 rounded-lg overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Minhas Rotas</h2>
          <button
            onClick={handleNew}
            className="w-full py-2 bg-primary text-on-primary font-bold rounded text-sm mb-4"
          >
            + Nova Rota
          </button>
          <ul>
            {routes.map((route) => (
              <li
                key={route.id}
                className={cn('rounded-md', {
                  'bg-primary/20': selectedRouteId === route.id,
                })}
              >
                <button
                  type="button"
                  onClick={() => handleSelectRoute(route)}
                  className={cn('w-full text-left p-2 rounded-md', {
                    'text-primary': selectedRouteId === route.id,
                    'hover:bg-surface-container-high': selectedRouteId !== route.id,
                  })}
                >
                  <p className="font-medium">{route.name}</p>
                  <p className="text-sm opacity-70">{route.customer_name}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Coluna 2: Editor de Rota */}
        <div className="w-2/3 bg-surface-container-lowest p-4 rounded-lg overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">
            {selectedRouteId ? 'Editando Rota' : 'Nova Rota'}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-on-surface/80">
                Cliente
              </label>
              <select
                id="customer"
                value={formState.customer_id || ''}
                onChange={(e) =>
                  setFormState({ ...formState, customer_id: Number(e.target.value) })
                }
                className="mt-1 block w-full p-2 border border-outline-variant/30 rounded-md bg-transparent text-on-surface"
              >
                <option value="">Selecione um cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="text-sm text-error mt-1">{errors.customer_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-on-surface/80">
                Nome da Rota
              </label>
              <input
                type="text"
                id="name"
                value={formState.name || ''}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="mt-1 block w-full p-2 border border-outline-variant/30 rounded-md bg-transparent text-on-surface"
                placeholder="Ex: Rota da Fazenda"
              />
              {errors.name && <p className="text-sm text-error mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="distance_km" className="block text-sm font-medium text-on-surface/80">
                Distância (km)
              </label>
              <input
                type="number"
                id="distance_km"
                value={formState.distance_km || ''}
                onChange={(e) =>
                  setFormState({ ...formState, distance_km: Number(e.target.value) })
                }
                className="mt-1 block w-full p-2 border border-outline-variant/30 rounded-md bg-transparent text-on-surface"
                placeholder="0"
              />
              {errors.distance_km && (
                <p className="text-sm text-error mt-1">{errors.distance_km}</p>
              )}
            </div>

            {/* Waypoints Section */}
            {selectedRouteId && (
              <>
                <h3 className="font-medium mt-4 mb-2">Pontos de Parada:</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newWaypointName}
                    onChange={(e) => setNewWaypointName(e.target.value)}
                    className="flex-1 p-2 border border-outline-variant/30 rounded-md bg-transparent text-on-surface"
                    placeholder="Nome do Ponto (ex: Rua X, Cidade Y)"
                  />
                  <button
                    onClick={handleAddWaypointFromInput}
                    className="px-4 py-2 bg-secondary text-on-secondary font-bold rounded text-sm"
                  >
                    Adicionar
                  </button>
                </div>

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
                      {waypoints.map((waypoint) => (
                        <SortableWaypoint
                          key={waypoint.id}
                          waypoint={waypoint}
                          onRemove={removeWaypoint}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </>
            )}

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-on-primary font-bold rounded text-sm"
              >
                Salvar Rota
              </button>
              {selectedRouteId && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-error text-on-error font-bold rounded text-sm"
                >
                  Excluir Rota
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
