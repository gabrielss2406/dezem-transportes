import { useState } from 'react'
import { Badge, Button, Card, Input, KpiCard, Modal, Select, Table, Toast } from '../components/ui'

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-on-surface-variant">
          {title}
        </h2>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>
      {children}
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-outline mt-2">{children}</p>
  )
}

// ── Color swatch ──────────────────────────────────────────────────────────────
const colorTokens = [
  { token: 'primary', hex: '#ffb959', dark: true },
  { token: 'on-primary', hex: '#462a00', dark: false },
  { token: 'primary-container', hex: '#c78205', dark: true },
  { token: 'secondary', hex: '#eabf8a', dark: true },
  { token: 'tertiary', hex: '#90cdff', dark: true },
  { token: 'error', hex: '#ffb4ab', dark: true },
  { token: 'surface', hex: '#0e0e0e', dark: true },
  { token: 'surface-container-lowest', hex: '#0a0a0a', dark: true },
  { token: 'surface-container-low', hex: '#1c1c1c', dark: true },
  { token: 'surface-container', hex: '#242424', dark: true },
  { token: 'surface-container-high', hex: '#2e2e2e', dark: true },
  { token: 'surface-container-highest', hex: '#383838', dark: true },
  { token: 'on-surface', hex: '#e6e1e5', dark: true },
  { token: 'on-surface-variant', hex: '#c4c7c5', dark: true },
  { token: 'outline', hex: '#8e918f', dark: false },
  { token: 'outline-variant', hex: '#333333', dark: true },
]

function Swatch({ token, hex, dark }: { token: string; hex: string; dark: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="w-full h-12 rounded-lg border border-outline-variant/20 shadow-sm"
        style={{ backgroundColor: hex }}
      />
      <p
        className={`text-[10px] font-bold ${dark ? 'text-on-surface' : 'text-on-surface-variant'}`}
      >
        {token}
      </p>
      <p className="text-[10px] font-mono text-outline">{hex}</p>
    </div>
  )
}

// ── Sample table data ─────────────────────────────────────────────────────────
const SAMPLE_ROWS = [
  { id: 1, name: 'Soja em Grãos', unit: 'ton' },
  { id: 2, name: 'Milho Híbrido Tipo A', unit: 'ton' },
  { id: 3, name: 'Fertilizante NPK', unit: 'kg' },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [inputVal, setInputVal] = useState('')
  const [selectVal, setSelectVal] = useState('')

  function triggerToast(type: 'success' | 'error') {
    setToastType(type)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  return (
    <div className="p-12 max-w-7xl mx-auto space-y-16 pb-24">
      {toastVisible && (
        <Toast
          message={
            toastType === 'success'
              ? 'Operação realizada com sucesso!'
              : 'Ocorreu um erro inesperado.'
          }
          type={toastType}
        />
      )}

      {/* Header */}
      <div>
        <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
          Dezem Transportes
        </span>
        <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface">
          Design System
        </h1>
        <p className="text-on-surface-variant mt-2 text-base max-w-xl">
          Referência de componentes, tokens de cor, tipografia e padrões de layout usados em todo o
          sistema.
        </p>
      </div>

      {/* ── Color Palette ─────────────────────────────────────────────────── */}
      <Section title="Paleta de Cores">
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          {colorTokens.map((c) => (
            <Swatch key={c.token} {...c} />
          ))}
        </div>
        <div className="mt-6 p-4 bg-surface-container rounded-lg border border-outline-variant/10 text-xs text-on-surface-variant font-mono space-y-1">
          <p className="text-on-surface font-bold text-[10px] uppercase tracking-widest mb-2">
            Tema claro (Light) — :root
          </p>
          <p>
            --primary: 132 84 0 <span className="text-outline ml-4">{'/* #845400 */'}</span>
          </p>
          <p className="text-on-surface font-bold text-[10px] uppercase tracking-widest mt-4 mb-2">
            Tema escuro (Dark) — .dark
          </p>
          <p>
            --primary: 255 185 89 <span className="text-outline ml-4">{'/* #ffb959 */'}</span>
          </p>
        </div>
      </Section>

      {/* ── Typography ────────────────────────────────────────────────────── */}
      <Section title="Tipografia">
        <div className="space-y-6 bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          <div>
            <Label>
              Headline / Manrope — page title (text-5xl font-black font-headline tracking-tighter)
            </Label>
            <h1 className="text-5xl font-black font-headline tracking-tighter text-on-surface mt-1">
              Gestão de Frota
            </h1>
          </div>
          <div>
            <Label>Headline md — section title (text-2xl font-bold font-headline)</Label>
            <h2 className="text-2xl font-bold font-headline text-on-surface mt-1">
              Resultado por Caminhão
            </h2>
          </div>
          <div>
            <Label>Eyebrow — (text-xs font-bold uppercase tracking-widest text-primary)</Label>
            <span className="text-xs font-bold uppercase tracking-widest text-primary mt-1 block">
              Gestão Operacional
            </span>
          </div>
          <div>
            <Label>Body — Inter (text-sm text-on-surface)</Label>
            <p className="text-sm text-on-surface mt-1">
              Gerencie os manifestos de transporte e histórico de fretes.
            </p>
          </div>
          <div>
            <Label>Body muted — (text-sm text-on-surface-variant)</Label>
            <p className="text-sm text-on-surface-variant mt-1">
              Nenhuma viagem registrada no período selecionado.
            </p>
          </div>
          <div>
            <Label>
              Label — (text-[10px] font-black uppercase tracking-widest text-on-surface-variant)
            </Label>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-1">
              Motorista · Caminhão · Produto
            </p>
          </div>
          <div>
            <Label>Mono — (font-mono font-bold text-primary)</Label>
            <span className="font-mono font-bold text-primary text-sm mt-1 block">ABC-1D23</span>
          </div>
        </div>
      </Section>

      {/* ── Buttons ───────────────────────────────────────────────────────── */}
      <Section title="Botões">
        <div className="flex flex-wrap gap-4 items-center bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          <div className="flex flex-col items-center gap-2">
            <Button>Salvar</Button>
            <Label>primary / md</Label>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button size="sm">Salvar</Button>
            <Label>primary / sm</Label>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button variant="ghost">Cancelar</Button>
            <Label>ghost / md</Label>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
            <Label>ghost / sm</Label>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button variant="danger">Excluir</Button>
            <Label>danger / md</Label>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button disabled>Desabilitado</Button>
            <Label>disabled</Label>
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-8 border border-outline-variant/10 mt-4">
          <Label>CTA Primário (página) — usado nos headers das páginas</Label>
          <div className="mt-3">
            <button
              type="button"
              className="flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              Nova Viagem
            </button>
          </div>
          <Label>CTA Outline — variante usada em Produtos</Label>
          <div className="mt-3">
            <button
              type="button"
              className="flex items-center gap-2 bg-surface-container-low border border-primary/20 text-primary px-8 py-4 rounded font-bold text-sm hover:bg-primary hover:text-on-primary active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              Novo Produto
            </button>
          </div>
        </div>
      </Section>

      {/* ── Form Controls ─────────────────────────────────────────────────── */}
      <Section title="Campos de Formulário">
        <div className="grid grid-cols-2 gap-6 bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          <div>
            <Input
              label="Campo obrigatório"
              placeholder="Ex: João Silva"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <Label>Input — padrão</Label>
          </div>
          <div>
            <Input label="Campo opcional" optional placeholder="Ex: (99) 99999-9999" />
            <Label>Input — opcional</Label>
          </div>
          <div>
            <Input label="Campo com erro" value="valor inválido" error="Este campo é obrigatório" />
            <Label>Input — erro</Label>
          </div>
          <div>
            <Input label="Tipo numérico" type="number" placeholder="0,00" />
            <Label>Input — number</Label>
          </div>
          <div>
            <Select
              label="Selecione"
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              options={[
                { value: 'gas_station', label: 'Posto de Combustível' },
                { value: 'workshop', label: 'Oficina' },
                { value: 'quarry', label: 'Pedreira' },
              ]}
            />
            <Label>Select — padrão</Label>
          </div>
          <div>
            <Select
              label="Vinculado"
              optional
              value=""
              onChange={() => {}}
              options={[{ value: '1', label: 'ABC-1234 — Scania R540' }]}
            />
            <Label>Select — opcional</Label>
          </div>
        </div>
      </Section>

      {/* ── Badges ────────────────────────────────────────────────────────── */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-4 items-center bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          {(['gray', 'amber', 'green', 'red', 'blue'] as const).map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Badge label={color} color={color} />
              <Label>{color}</Label>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 bg-surface-container rounded-xl p-8 border border-outline-variant/10 mt-4">
          <span className="bg-surface-container-highest text-on-surface-variant text-[10px] font-black uppercase px-2.5 py-1 rounded">
            Tonelada
          </span>
          <Label>Tipo inline — usado nas tabelas de Produtos / Fornecedores</Label>
        </div>
      </Section>

      {/* ── Cards ─────────────────────────────────────────────────────────── */}
      <Section title="Cards">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <Card>
              <p className="text-sm text-on-surface-variant">Conteúdo do card base</p>
            </Card>
            <Label>Card — base</Label>
          </div>
          <div>
            <KpiCard label="Receita Total" value="R$ 48.200" sub="Período atual" />
            <Label>KpiCard — padrão</Label>
          </div>
          <div>
            <KpiCard label="Lucro Líquido" value="R$ 12.800" sub="24 viagens · 3.400 km" accent />
            <Label>KpiCard — accent</Label>
          </div>
        </div>

        {/* Stats card pattern */}
        <div className="mt-4">
          <Label>
            Stats Card — padrão usado nas páginas de cadastro (Caminhões, Motoristas, etc.)
          </Label>
          <div className="grid grid-cols-3 gap-6 mt-3">
            {[
              { label: 'Total de Caminhões', value: '12', icon: 'local_shipping' },
              { label: 'Km Acumulado', value: '84.320', icon: 'route' },
              { label: 'Capacidade Total', value: '420 ton', icon: 'scale' },
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
        </div>
      </Section>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Section title="Tabela">
        <Table
          columns={[
            { key: 'name', label: 'Nome' },
            { key: 'unit', label: 'Unidade' },
          ]}
          data={SAMPLE_ROWS}
          onEdit={() => {}}
          onDelete={() => {}}
        />
        <Label>Table — componente genérico com ações hover</Label>

        <div className="mt-6">
          <Label>
            Padrão inline — usado nas páginas de Clientes, Motoristas, etc. (ações com opacity-0
            group-hover:opacity-100)
          </Label>
          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 mt-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high">
                  {['Nome', 'Placa', 'Salário', ''].map((h) => (
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
                {[
                  { name: 'Ricardo Lima', plate: 'ABC-1234', salary: 'R$ 5.800' },
                  { name: 'André Silva', plate: 'XYZ-5678', salary: 'R$ 6.200' },
                ].map((row, i) => (
                  <tr
                    key={row.name}
                    className={`hover:bg-surface-bright/5 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center text-[10px] font-bold text-on-surface-variant shrink-0">
                          {row.name
                            .split(' ')
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')}
                        </div>
                        <span className="font-bold text-on-surface text-sm">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-primary text-sm">
                      {row.plate}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface">{row.salary}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          type="button"
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
        </div>
      </Section>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <Section title="Modal">
        <div className="bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          <Button onClick={() => setModalOpen(true)}>Abrir Modal</Button>
          <Label>Modal — backdrop blur-sm, max-w-lg, scroll interno</Label>
        </div>
        {modalOpen && (
          <Modal title="Exemplo de Modal" onClose={() => setModalOpen(false)}>
            <div className="flex flex-col gap-4">
              <Input label="Nome" placeholder="Ex: João Silva" />
              <Select
                label="Tipo"
                options={[
                  { value: 'a', label: 'Opção A' },
                  { value: 'b', label: 'Opção B' },
                ]}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setModalOpen(false)}>Salvar</Button>
            </div>
          </Modal>
        )}
      </Section>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <Section title="Toast">
        <div className="flex gap-4 bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          <Button onClick={() => triggerToast('success')}>Toast de Sucesso</Button>
          <Button variant="danger" onClick={() => triggerToast('error')}>
            Toast de Erro
          </Button>
        </div>
        <Label>Toast — fixed bottom-6 right-6, auto-dismiss 3s</Label>
      </Section>

      {/* ── Layout Patterns ───────────────────────────────────────────────── */}
      <Section title="Padrões de Layout">
        <div className="space-y-6 bg-surface-container rounded-xl p-8 border border-outline-variant/10 text-sm">
          <div>
            <Label>Wrapper de página</Label>
            <pre className="mt-2 text-xs font-mono text-on-surface-variant bg-surface-container-highest p-4 rounded-lg overflow-x-auto">{`<div className="p-12 max-w-7xl mx-auto">`}</pre>
          </div>
          <div>
            <Label>Grid de 3 colunas — stats cards</Label>
            <pre className="mt-2 text-xs font-mono text-on-surface-variant bg-surface-container-highest p-4 rounded-lg overflow-x-auto">{`<div className="grid grid-cols-3 gap-6 mb-10">`}</pre>
          </div>
          <div>
            <Label>Grid de 2 colunas — dashboard / split panels</Label>
            <pre className="mt-2 text-xs font-mono text-on-surface-variant bg-surface-container-highest p-4 rounded-lg overflow-x-auto">{`<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">`}</pre>
          </div>
          <div>
            <Label>Bento assimétrico — Custos (form + tabela)</Label>
            <pre className="mt-2 text-xs font-mono text-on-surface-variant bg-surface-container-highest p-4 rounded-lg overflow-x-auto">{`<div className="grid grid-cols-12 gap-8">
  <div className="col-span-4"> {/* form */} </div>
  <div className="col-span-8"> {/* tabela */} </div>
</div>`}</pre>
          </div>
          <div>
            <Label>App shell — flex h-screen overflow-hidden</Label>
            <pre className="mt-2 text-xs font-mono text-on-surface-variant bg-surface-container-highest p-4 rounded-lg overflow-x-auto">{`<div className="flex h-screen bg-surface overflow-hidden">
  <Sidebar />                          {/* w-64 sticky */}
  <main className="flex-1 overflow-y-auto"> ... </main>
</div>`}</pre>
          </div>
        </div>
      </Section>

      {/* ── Icons ─────────────────────────────────────────────────────────── */}
      <Section title="Ícones — Material Symbols Outlined">
        <div className="bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          <p className="text-sm text-on-surface-variant mb-6">
            Fonte: <span className="font-mono text-primary">Material Symbols Outlined</span>. Estado
            padrão: FILL 0. Ativo/selecionado: FILL 1.
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-6">
            {[
              ['analytics', 'Dashboard'],
              ['group', 'Clientes'],
              ['inventory_2', 'Produtos'],
              ['handshake', 'Fornecedores'],
              ['local_shipping', 'Caminhões'],
              ['badge', 'Motoristas'],
              ['route', 'Viagens'],
              ['payments', 'Custos'],
              ['add', 'Adicionar'],
              ['edit', 'Editar'],
              ['delete', 'Excluir'],
              ['person_add', 'Novo Membro'],
              ['check_circle', 'Sucesso'],
              ['error', 'Erro'],
              ['search', 'Buscar'],
              ['logout', 'Sair'],
              ['grain', 'Produto'],
              ['scale', 'Peso'],
              ['local_gas_station', 'Posto'],
              ['build', 'Oficina'],
              ['foundation', 'Pedreira'],
              ['business', 'Empresa'],
              ['payments', 'Pagamento'],
              ['light_mode', 'Tema Claro'],
            ].map(([icon, label]) => (
              <div key={icon} className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
                </div>
                <span className="text-[9px] text-outline leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                local_shipping
              </span>
              <Label>FILL 0 (padrão)</Label>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span
                className="material-symbols-outlined text-2xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
              >
                local_shipping
              </span>
              <Label>FILL 1 (ativo)</Label>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Nav Item ──────────────────────────────────────────────────────── */}
      <Section title="Navegação — Sidebar NavItem">
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 w-64 space-y-0.5">
          {[
            { label: 'Dashboard', icon: 'analytics', active: false },
            { label: 'Caminhões', icon: 'local_shipping', active: true },
            { label: 'Motoristas', icon: 'badge', active: false },
          ].map(({ label, icon, active }) => (
            <div
              key={label}
              className={
                active
                  ? 'flex items-center gap-4 px-4 py-3.5 rounded-lg text-primary bg-surface-container-highest/40 relative font-bold text-sm border-l-[3px] border-primary'
                  : 'flex items-center gap-4 px-4 py-3.5 rounded-lg text-on-surface-variant text-sm font-medium'
              }
            >
              <span
                className="material-symbols-outlined text-xl"
                style={
                  active
                    ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                    : {}
                }
              >
                {icon}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <Label>
          Inativo — text-on-surface-variant · Ativo — text-primary + border-l-[3px] border-primary +
          FILL 1
        </Label>
      </Section>
    </div>
  )
}
