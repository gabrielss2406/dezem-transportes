import { useState } from 'react'
import { Button, Modal } from './ui'

export interface FieldSelectionOption {
  key: string
  label: string
}

interface FieldSelectionModalProps {
  title: string
  fields: FieldSelectionOption[]
  initialSelected: string[]
  onCancel: () => void
  onConfirm: (selectedKeys: string[], saveAsDefault: boolean) => void
  extraOption?: { label: string; checked: boolean; onChange: (checked: boolean) => void }
}

export function FieldSelectionModal({
  title,
  fields,
  initialSelected,
  onCancel,
  onConfirm,
  extraOption,
}: FieldSelectionModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [saveAsDefault, setSaveAsDefault] = useState(false)

  const toggleField = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const allSelected = selected.size === fields.length
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(fields.map((f) => f.key)))
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            Escolha os campos que devem aparecer no PDF.
          </p>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-bold text-primary hover:underline"
          >
            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {fields.map((field) => (
            <label
              key={field.key}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high cursor-pointer text-sm text-on-surface"
            >
              <input
                type="checkbox"
                checked={selected.has(field.key)}
                onChange={() => toggleField(field.key)}
                className="accent-primary"
              />
              {field.label}
            </label>
          ))}
        </div>

        {extraOption && (
          <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={extraOption.checked}
              onChange={(e) => extraOption.onChange(e.target.checked)}
              className="accent-primary"
            />
            {extraOption.label}
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsDefault}
            onChange={(e) => setSaveAsDefault(e.target.checked)}
            className="accent-primary"
          />
          Salvar como configuração padrão para próximas exportações
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(Array.from(selected), saveAsDefault)}
            disabled={selected.size === 0}
          >
            Gerar PDF
          </Button>
        </div>
      </div>
    </Modal>
  )
}
