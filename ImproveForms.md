# Guia de Implementação: Navegação por Teclado e Pesquisa por Custom ID

## Resumo da Feature
Este guia documenta duas melhorias focadas em produtividade e experiência do usuário (UX) aplicáveis aos formulários do sistema:
1. **Pesquisa por ID Personalizado (Custom ID):** Permite que o componente `Select` encontre registros não apenas pelo nome, mas também pelo seu ID de sistema (`customId`). Isso é feito sem alterar o nome principal exibido após a seleção.
2. **Navegação Contínua com "Enter":** Permite que o usuário preencha o formulário inteiro sem usar o mouse. Ao pressionar "Enter", o sistema automaticamente foca e/ou abre o próximo campo e, no último campo, submete o formulário (com um aviso de confirmação).

---

## 1. Como aplicar a Pesquisa por Custom ID

O componente `<Select>` (em `ui.tsx`) foi modificado para suportar a propriedade `searchableLabel` e uma lógica de ordenação otimizada.

Para aplicar em qualquer tela, ao passar as `options` para o `Select`, adicione a propriedade `searchableLabel` juntando o nome e o ID, e personalize o `label` (ReactNode) para mostrar o ID visualmente:

```tsx
<Select
  label="Cliente"
  value={field.value}
  onChange={field.onChange}
  options={customers.map((c) => ({
    value: c.id,
    // 1. O que aparece na lista suspensa (JSX):
    label: (
      <div className="flex justify-between">
        <span>{c.name}</span>
        {c.customId && <span className="text-on-surface-variant/50">#{c.customId}</span>}
      </div>
    ),
    // 2. O que aparece no input após selecionado (String):
    displayLabel: c.name,
    // 3. String oculta usada especificamente para a pesquisa:
    searchableLabel: `${c.name} ${c.customId || ''}`,
  }))}
/>
```

## 2. Como aplicar a Navegação Contínua com "Enter"

Os componentes `<Select>`, `<Input>` e `<CurrencyInput>` foram adaptados para receber `ref` e eventos de teclado (`onEnterSelect` no Select e `onKeyDown` nos Inputs).

### Passo A: Criar as referências (refs)
No início do seu componente de página, crie as referências para os campos:
```tsx
import { useRef } from 'react'
import { SelectRef } from '../components/ui' // Importe a tipagem

// ... dentro do componente
const primeiroSelectRef = useRef<SelectRef>(null)
const segundoSelectRef = useRef<SelectRef>(null)
const precoInputRef = useRef<HTMLInputElement>(null)
```

### Passo B: Encadeamento de foco
Passe as refs para os respectivos componentes e use os eventos para "pular" para o próximo campo:

**Do 1º Select para o 2º Select (abrindo o menu):**
```tsx
<Select
  ref={primeiroSelectRef}
  onEnterSelect={() => {
    // Usa setTimeout para garantir que a renderização acompanhe
    setTimeout(() => segundoSelectRef.current?.open(), 10)
  }}
  // ...
/>
```

**Do 2º Select para um Input de texto/moeda (apenas focando):**
```tsx
<Select
  ref={segundoSelectRef}
  onEnterSelect={() => {
    setTimeout(() => precoInputRef.current?.focus(), 10)
  }}
  // ...
/>
```

### Passo C: Submissão no último campo e Modais de Confirmação
Evite o uso do `confirm()` nativo do navegador, pois ele trava o foco do Electron. Em vez disso, use o componente `ConfirmModal` em conjunto com um estado (ex: `pendingData` para salvamento ou `deleteTarget` para exclusão).

No último campo do formulário, intercepte o `onKeyDown` para detectar a tecla `Enter` e definir os dados pendentes:

```tsx
<CurrencyInput
  ref={precoInputRef}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Gatilha a validação e, se OK, define os dados para abrir o ConfirmModal
      handleSubmit((data) => setPendingData(data))()
    }
  }}
/>

// No JSX:
{pendingData && (
  <ConfirmModal
    message="Tem certeza que deseja cadastrar?"
    onConfirm={() => save(pendingData)}
    onCancel={() => setPendingData(null)}
  />
)}
```

## 3. Fechamento Seguro via ESC

O componente `<Modal>` foi atualizado para suportar a propriedade `onEscape`. Use o estado `isDirty` do `react-hook-form` para avisar o usuário se ele tentar fechar um formulário com dados preenchidos.

```tsx
const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

const handleEscape = () => {
  if (isDirty) {
    setShowDiscardConfirm(true) // Abre o ConfirmModal de descarte
  } else {
    setModal(false) // Fecha direto se estiver vazio
  }
}

// No JSX:
<Modal 
  title="..." 
  onClose={() => setModal(false)} 
  onEscape={handleEscape}
>
  ...
</Modal>

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
```

### Opcional: Abrir o primeiro campo ao carregar
Se o formulário estiver em um Modal que abre via estado (ex: `modal === true`), você pode forçar a janela do aplicativo a ter foco e abrir o primeiro Select imediatamente:

```tsx
useEffect(() => {
  if (modal) {
    setTimeout(() => {
      window.focus() // Garante o foco no app
      primeiroSelectRef.current?.open()
    }, 200) // 200ms garante que a animação do modal já terminou
  }
}, [modal])
```
