import React, { useState, useRef, useEffect, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import type { Supplier } from '../lib/types'

export interface SupplierComboboxRef {
  focus: () => void
  open: () => void
}

export interface SupplierComboboxProps {
  label?: string
  optional?: boolean
  error?: string
  suppliers: Supplier[]
  value?: number | null
  onChange?: (id: number | null) => void
  onPendingChange?: (name: string | null) => void
  onEnterSelect?: () => void
  placeholder?: string
  className?: string
}

export const SupplierCombobox = React.forwardRef<SupplierComboboxRef, SupplierComboboxProps>(
  (
    {
      label,
      optional,
      error,
      suppliers,
      value,
      onChange,
      onPendingChange,
      onEnterSelect,
      placeholder = 'Selecione...',
      className = '',
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const [pendingName, setPendingName] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
    const uniqueId = useRef(Math.random())
    const id = React.useId()

    useImperativeHandle(ref, () => ({
      focus: () => buttonRef.current?.focus(),
      open: () => {
        setIsOpen(true)
        document.dispatchEvent(
          new CustomEvent('close-other-suppliercombobox', { detail: { id: uniqueId.current } }),
        )
      },
    }))

    useEffect(() => {
      const handleClose = (e: CustomEvent) => {
        if (e.detail.id !== uniqueId.current) {
          setIsOpen(false)
        }
      }
      document.addEventListener('close-other-suppliercombobox', handleClose as EventListener)
      return () => {
        document.removeEventListener('close-other-suppliercombobox', handleClose as EventListener)
      }
    }, [])

    const selectedOption = suppliers.find((s) => s.id === value)

    const getSearchableLabel = (supplier: Supplier): string => {
      return `${supplier.name} ${supplier.customId || ''}`.trim()
    }

    const filteredSuppliers = suppliers
      .filter((s) => getSearchableLabel(s).toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aLabel = getSearchableLabel(a).toLowerCase()
        const bLabel = getSearchableLabel(b).toLowerCase()
        const lowerSearchTerm = searchTerm.toLowerCase()

        if (aLabel === lowerSearchTerm && bLabel !== lowerSearchTerm) {
          return -1
        }
        if (aLabel !== lowerSearchTerm && bLabel === lowerSearchTerm) {
          return 1
        }

        const aWords = aLabel.split(' ')
        const bWords = bLabel.split(' ')
        const aMatches = aWords.filter((w) => w.startsWith(lowerSearchTerm))
        const bMatches = bWords.filter((w) => w.startsWith(lowerSearchTerm))

        if (aMatches.length > 0 && bMatches.length === 0) {
          return -1
        }
        if (aMatches.length === 0 && bMatches.length > 0) {
          return 1
        }

        if (aMatches.length > 0 && bMatches.length > 0) {
          const aMin = Math.min(...aMatches.map((w) => w.length))
          const bMin = Math.min(...bMatches.map((w) => w.length))
          if (aMin < bMin) {
            return -1
          }
          if (aMin > bMin) {
            return 1
          }
        }

        return aLabel.localeCompare(bLabel)
      })

    const updateCoords = React.useCallback(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }, [])

    useEffect(() => {
      if (isOpen) {
        updateCoords()
        window.addEventListener('resize', updateCoords)
        window.addEventListener('scroll', updateCoords, true)
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus()
            searchInputRef.current.select()
          }
        }, 50)
        setSearchTerm('')
        setHighlightedIndex(0)
      }
      return () => {
        window.removeEventListener('resize', updateCoords)
        window.removeEventListener('scroll', updateCoords, true)
      }
    }, [isOpen, updateCoords])

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
          finalizePendingName()
        }
      }
      if (isOpen) {
        document.addEventListener('click', handleClickOutside)
      }
      return () => document.removeEventListener('click', handleClickOutside)
    }, [isOpen])

    const finalizePendingName = () => {
      if (searchTerm.trim() === '') {
        setPendingName(null)
        onPendingChange?.(null)
      } else {
        const exactMatch = suppliers.some(
          (s) => s.name.toLowerCase().trim() === searchTerm.toLowerCase().trim(),
        )
        if (!exactMatch && value === undefined && searchTerm.trim().length > 0) {
          setPendingName(searchTerm.trim())
          onPendingChange?.(searchTerm.trim())
        } else if (exactMatch || value !== undefined) {
          setPendingName(null)
          onPendingChange?.(null)
        }
      }
    }

    const handleSearchChange = (newTerm: string) => {
      setSearchTerm(newTerm)
      setHighlightedIndex(0)
      onChange?.(undefined)
      setPendingName(null)
      onPendingChange?.(null)
    }

    const handleSelectOption = (supplier: Supplier) => {
      onChange?.(supplier.id)
      setPendingName(null)
      onPendingChange?.(null)
      setIsOpen(false)
      setSearchTerm('')
    }

    const displayValue = selectedOption ? selectedOption.name : pendingName ? pendingName : ''

    return (
      <div className={`flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
        {label && (
          <div className="flex items-center gap-1">
            <label
              htmlFor={id}
              className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {label}{' '}
              {optional && <span className="text-outline font-normal normal-case">(opcional)</span>}
            </label>
            <span
              className="cursor-help text-on-surface-variant/60 text-sm"
              title="Digite o nome de um fornecedor existente para selecioná-lo, ou um nome novo — se não for encontrado, um cadastro simples será criado automaticamente ao salvar."
            >
              ⓘ
            </span>
          </div>
        )}

        {(() => {
          const stateClasses = error
            ? 'border-error focus:border-error focus:ring-error/30'
            : 'border-outline-variant/30 focus:border-primary focus:ring-primary/30'
          return (
            <button
              id={id}
              ref={buttonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const newIsOpen = !isOpen
                setIsOpen(newIsOpen)
                if (newIsOpen) {
                  document.dispatchEvent(
                    new CustomEvent('close-other-suppliercombobox', {
                      detail: { id: uniqueId.current },
                    }),
                  )
                }
              }}
              className={`flex items-center justify-between bg-surface-container-lowest border ${stateClasses} rounded-lg px-4 py-3 text-sm text-on-surface text-left focus:outline-none focus:ring-2 transition-all`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className={`truncate flex items-center gap-2 ${!displayValue ? 'text-on-surface-variant/40' : ''}`}
                >
                  {displayValue || placeholder}
                  {pendingName && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded whitespace-nowrap">
                      novo
                    </span>
                  )}
                </span>
              </div>
              <span
                className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              >
                expand_more
              </span>
            </button>
          )
        })()}

        {isOpen &&
          createPortal(
            <button
              type="button"
              className="fixed z-[9999] bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                top: coords.top + 4,
                left: coords.left,
                width: coords.width,
              }}
            >
              <div className="p-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setHighlightedIndex((prev) =>
                        prev < filteredSuppliers.length - 1 ? prev + 1 : prev,
                      )
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (filteredSuppliers.length > 0) {
                        handleSelectOption(filteredSuppliers[highlightedIndex])
                        onEnterSelect?.()
                      } else if (searchTerm.trim().length > 0) {
                        setPendingName(searchTerm.trim())
                        onPendingChange?.(searchTerm.trim())
                        setIsOpen(false)
                        setSearchTerm('')
                        onEnterSelect?.()
                      }
                    }
                  }}
                  onBlur={finalizePendingName}
                  placeholder="Pesquisar..."
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {optional && searchTerm.length === 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onChange?.(undefined)
                      setPendingName(null)
                      onPendingChange?.(null)
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-primary/10 text-on-surface-variant italic"
                  >
                    Limpar
                  </button>
                )}
                {filteredSuppliers.map((supplier, index) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelectOption(supplier)
                      onEnterSelect?.()
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      index === highlightedIndex
                        ? 'bg-primary/20 text-on-surface'
                        : 'hover:bg-primary/10 text-on-surface'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{supplier.name}</span>
                      {supplier.customId && (
                        <span className="text-on-surface-variant/50 text-xs">
                          #{supplier.customId}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {filteredSuppliers.length === 0 && searchTerm.trim().length > 0 && (
                  <div className="px-4 py-2.5 text-sm text-on-surface-variant/60 italic">
                    Nenhum fornecedor encontrado
                  </div>
                )}
              </div>
            </button>,
            document.body,
          )}

        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    )
  },
)

SupplierCombobox.displayName = 'SupplierCombobox'
