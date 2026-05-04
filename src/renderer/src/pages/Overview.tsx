interface OverviewProps {
  onNavigate: (path: string) => void
  onLogout: () => void
}

const sidebarItems = [
  { icon: 'dashboard', label: 'Dashboard', path: '/' },
  { icon: 'group', label: 'Clientes', path: '/customers' },
  { icon: 'inventory_2', label: 'Produtos', path: '/products' },
  { icon: 'factory', label: 'Fornecedores', path: '/suppliers' },
  { icon: 'local_shipping', label: 'Frota', path: '/trucks' },
  { icon: 'add_road', label: 'Nova Viagem', path: '/trips' },
  { icon: 'payments', label: 'Custos', path: '/costs' },
]

const modules = [
  {
    num: '01',
    title: 'Login',
    tag: 'Acesso Restrito',
    path: null,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBL-ieFt_YzC8Q2Y8smIldS3ywiP-oNiEAhHvfG0BuRtPUEp3BFZXt23hZubpAwiyfuxj92WzEryB00dUuZ6THH5jf2uM9cg12613iHcASSkFGOxGhcRehohiphLKoZMurkP0tAm32SsS1rJtMaX3ByQSnkVOwlN5kchZXwSVW7D_3e8eUD-MWGggn--_sJX5gsZ7JNxgzSkJJP1NQ1b7nw9MwQmEZsliXvLdu88oZf_2b_fA2aP9LYupCrfrjPNloCro3HtgwvR3c',
  },
  {
    num: '02',
    title: 'Dashboard',
    tag: 'Painel de Controle',
    path: '/',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuK-MdOPJBJX1tCpcVekFlEcgYwEVGrcvV5BXAToC2ofMVCbh6z6o9A44w-_DyWIQvgZTW_SymMw-VW9VFRWU0x6NhvDJQcCv_pJXbSEBODd2ZqeYUQolxsuZBWqFbnFTw8Gxo1pZh2Bnw_hQsBdWHel_mVAT2t4RFUitAYitsGxwmYnpuodSHAqQXfxw3rQ0UEYKC245B-TwGRfJ_YsOBI3RrlcCuLpNNXsACRZAmLKFGKRWs2lCctoynKzog3j9SsB5TLg9FzfU',
  },
  {
    num: '03',
    title: 'Clientes',
    tag: 'CRM de Logística',
    path: '/customers',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDy7v8xALXzwKjynNhuSAbwGexYVCp_0R_94vj7w78zvsLy3Rk1Cvwy8CUyLbYccc3vvEPbZrtPB_8eyTUnJBXfL_CUxl3BFdJu2K0sXqt3khxT6ZSNm0DJ0wMINaJT5ab2OX35un-UhUTpdBknueWUnIm8n3cUHNDCvvqtQm_EdT1DA6ozeGJ6BREsCe2c4BJwyb5pijAX422Jt9Va47gRaClTsvWgwxps1Mg6fkze6Wl6vCzIHGNGvIMfT4gU58axvaROZBYxTcI',
  },
  {
    num: '04',
    title: 'Produtos',
    tag: 'Catálogo de Cargas',
    path: '/products',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1yauhYm6Y-Pzh_MS4NQAXGu7ajbpibdMHjTzK_CvMvYvASrQqO51j-9ZLNiEAbBtkYo-lRS_jq2prViFoHcDeXRyvj4BdyOwIsnTim4psAGtlnowTZs9wq8WHvEtq0x2onxuiEIE3H6zq9W6rzX2L3jhLqiT4urT7Spjpgi7Pqft3b9d6-6p-Vr0ejoeBwyK7CrtVjoYu4dXeLhKBCPxJi8ExmKO51kbeUTYZPGlQ5gj19TH0pwmLeVV15Xws8-D83_j24mHSE0s',
  },
  {
    num: '05',
    title: 'Fornecedores',
    tag: 'Rede de Suprimentos',
    path: '/suppliers',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNCx8kDF-xAPXQ7kbNGdqywRjWhi8QJiNnxSmXuABW0uO65jOksHl0XEzC6kgGzDSwBp_jFn-Lm3SHggMtv4Anm7qBcLKeOVSVFl0B34sjvg8Pe3QxnDtTvtnF3M2OkQQHhZ69Gd3cg7RpYItnS9AQSPSMgef3Qm6lNNBBdzwosrIK8l9RwQDGid0J_1QWyD27TlytQgcLWhxXYQxocMKrSt9ZI7LHXIWqCdgr3IOtH_ETFIs3C8vONdOCziM5zXLmUWD2zzL8g7k',
  },
  {
    num: '06',
    title: 'Frota',
    tag: 'Gestão de Veículos',
    path: '/trucks',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWEwN9DDl3lNojSqkSHN_XzwQFLnzn5tmg0HKbkbO1JI-FL--BRE3CIYbml7TZc-s2r8fnCY2qI3xC0-JkdWa4XotpKn9FLfoiGzNVkMC6aeHjeTf_KqVQ8mlsyqeF4nb8xKWWongUB9LowSGzTPrr4G5uaBeE2Imb_mpiX-WBpc3RsfKG9tPWRPKrIWqL8JUaiY4VQpjtN4xZzo1v7OWQ7aUEgnK66Gc5VEDK69DCEPVt-HMC5ZynC4cpddIZHLJttz_KjWqmomk',
  },
  {
    num: '07',
    title: 'Nova Viagem',
    tag: 'Escalonamento',
    path: '/trips',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWPPKJ5w2doVVzW3GvOvR1mkOk_zMawdsJhhN-yP1dFUXDixaoeTGJKgp2oFfp1wsqblpxPwPDPnNgYZHoszNmqAtlsYnArjr4A50GdCNLJFDB4wgeLyCWciQ4Gm-G4zevJmcGvK-kB3XK0MNxzd0cZnKQhYF4myE9_wRRsysvy2TRLun7-UxG7XZcmAKZ1SLa1T9LPT-gLSsP74L9nwZvqDOCZeV21fOVoIWqXZchS2oFUZQw9-xf3o1ho8-EhlM-XoDVOKuw_Us',
  },
  {
    num: '08',
    title: 'Custos',
    tag: 'Financeiro & Margem',
    path: '/costs',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBl-TIHU_mmIMJxK8b72rrtjmSIM58xZUR1WBux_6Wdl61EOfjUAXhCYdkefeDe2qbBqXFTYc07HrCHoOJiQi33eytLU9D0aKXTIvHo6erUePCZqEwqonifyvVNr3Woswft84Sa-N2z8qd7gWsPpsqUcINOzTBtjWG2rRNVR8-3CxxtO2rFry489cu9d9b264CeBssSv217SAJeR4ZpGrfrZbfVoi4OgFyUuMke1dLLksWN8o7W3Q-580dX5HrwiY2C9Dk4djH-aS8',
  },
  {
    num: '09',
    title: 'Relatórios',
    tag: 'Business Intelligence',
    path: null,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEIH64FFMmMtnqFhiG0CnrXkakfuLY2oUf0tSScUzhBYF34Zbdc7r9VnbzvwRARZ2XJZ7n3qXz5o3av-BULxxPTW-0W1n13WVZY0ubjb_ok9s8fTaL0YidBRPkU1-SlEpXv2y-ybibVp7HYTJ8SUwVbrx2bkrqH03I2gv-eIt78Hz4-eZ7ftm-FGyGdkunOZYIYW07pgX4JuB6chPyUvGqjk3a1CLr30ztwkqKJdzjnthHllwzTWBbaT3sRT-7nQOtXs3Mt9rAQlA',
  },
  {
    num: '10',
    title: 'PDF Preview',
    tag: 'Exportação Técnica',
    path: null,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_lZI6zXeG-srqB6XKvYq4jCt-YTIRDuLY15pW4XedhKE7aHn9y6ByEwBvDoWfaseZuqezE2WFkJ0xT3RfHaxumWIn6unvzaDIWTaP-S3KddHIW9X1FYOKvvDPLursvDndxTtq3wNAqmE5D9eAwWqraJlN9B4IRWpLp4Ra1OSiixCcFPGw723kTkZa3O7DoFFZhP2BQ8lOFUa6PsIA80iuVxJP1bAoHPZZGTK-netL5j1nEc3Dvw1MREtE-UHwXZ29UdH2doydjQQ',
  },
]

export function OverviewPage({ onNavigate, onLogout }: OverviewProps) {
  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: '#121412', color: '#e3e2df', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Sidebar */}
      <aside
        className="h-full w-64 fixed left-0 top-0 flex flex-col py-6 border-r z-50"
        style={{ backgroundColor: '#1c1c1a', borderColor: 'rgba(68,65,58,0.2)' }}
      >
        <div className="px-6 mb-10">
          <h1 className="text-lg font-black text-amber-500 font-headline uppercase tracking-tighter">
            Dezem Transportes
          </h1>
          <p
            className="font-headline uppercase tracking-widest text-stone-500 mt-1"
            style={{ fontSize: '10px' }}
          >
            Gestão Logística
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className="w-full flex items-center px-6 py-3 text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-all font-headline uppercase tracking-widest text-xs text-left"
            >
              <span className="material-symbols-outlined mr-3 text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-6 pt-6 mt-auto border-t" style={{ borderColor: 'rgba(68,65,58,0.3)' }}>
          <button
            onClick={() => onNavigate('/')}
            className="w-full py-3 rounded text-xs font-bold font-headline uppercase tracking-widest mb-6 text-amber-500"
            style={{ backgroundColor: '#0d0f0d' }}
          >
            Relatórios
          </button>
          <div className="space-y-4">
            <button className="flex items-center text-stone-500 hover:text-stone-200 text-xs font-headline uppercase tracking-widest">
              <span className="material-symbols-outlined mr-3 text-sm">settings</span>
              Configurações
            </button>
            <button
              onClick={onLogout}
              className="flex items-center text-stone-500 hover:text-stone-200 text-xs font-headline uppercase tracking-widest"
            >
              <span className="material-symbols-outlined mr-3 text-sm">logout</span>
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64" style={{ backgroundColor: '#121412' }}>
        {/* Top Header */}
        <header
          className="fixed top-0 left-64 right-0 z-40 h-20 backdrop-blur-md flex justify-between items-center px-8 border-b"
          style={{
            backgroundColor: 'rgba(10,10,10,0.8)',
            borderColor: 'rgba(68,65,58,0.2)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
          }}
        >
          <div className="flex items-center gap-8">
            <span className="text-2xl font-bold tracking-tighter text-amber-500 font-headline">
              Visão Geral
            </span>
            <nav className="hidden lg:flex items-center gap-6">
              {[
                { label: 'Frota', path: '/trucks' },
                { label: 'Viagens', path: '/trips' },
                { label: 'Custos', path: '/costs' },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className="text-stone-400 hover:text-stone-100 transition-colors font-headline tracking-tight text-sm"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-stone-400 rounded-lg transition-all hover:bg-stone-800/50">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-stone-400 rounded-lg transition-all hover:bg-stone-800/50">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </header>

        {/* Canvas */}
        <section className="mt-20 p-12 min-h-screen">
          {/* Page Header */}
          <header className="mb-16 max-w-4xl">
            <h2
              className="text-5xl font-black font-headline tracking-tighter mb-4"
              style={{ color: '#e3e2df' }}
            >
              Arquitetura do Ecossistema
            </h2>
            <p
              className="text-lg font-body leading-relaxed"
              style={{ color: '#d7c3af', opacity: 0.7 }}
            >
              Abaixo, apresentamos o mapa visual de todas as interfaces críticas que compõem o
              sistema <span className="text-amber-500 font-bold">Dezem Transportes</span>. Cada
              módulo foi projetado para máxima eficiência operacional com estética editorial.
            </p>
          </header>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
            {modules.map((mod) => (
              <button
                key={mod.num}
                type="button"
                className={`group text-left ${mod.path ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => mod.path && onNavigate(mod.path)}
                onKeyDown={(e) => e.key === 'Enter' && mod.path && onNavigate(mod.path)}
              >
                <div
                  className="relative aspect-video overflow-hidden transition-transform duration-500 group-hover:-translate-y-2"
                  style={{ backgroundColor: '#1b1c1a' }}
                >
                  <img
                    src={mod.img}
                    alt={mod.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-60 group-hover:opacity-100"
                  />
                  <div
                    className="absolute inset-0 flex items-end p-6"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.8), transparent, transparent)',
                    }}
                  >
                    <span className="text-amber-500 font-headline font-black text-4xl">
                      {mod.num}
                    </span>
                  </div>
                </div>
                <div
                  className="mt-6 flex justify-between items-baseline pb-4 border-b"
                  style={{ borderColor: 'rgba(82,69,53,0.2)' }}
                >
                  <h3 className="text-xl font-bold font-headline" style={{ color: '#e3e2df' }}>
                    {mod.title}
                  </h3>
                  <span
                    className="text-xs font-label uppercase tracking-widest"
                    style={{ color: 'rgba(255,185,89,0.6)' }}
                  >
                    {mod.tag}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Footer Stats */}
          <footer
            className="mt-32 pt-12 flex flex-col md:flex-row justify-between items-start gap-12 border-t-2"
            style={{ borderColor: 'rgba(255,185,89,0.2)' }}
          >
            <div className="max-w-md">
              <p
                className="text-xs font-label uppercase tracking-widest text-amber-500 mb-2"
                style={{ letterSpacing: '0.2em' }}
              >
                Resumo do Projeto
              </p>
              <h4
                className="text-3xl font-bold font-headline tracking-tight"
                style={{ color: '#e3e2df' }}
              >
                Um sistema integrado para a nova era da logística.
              </h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {[
                { value: '10', label: 'Interfaces' },
                { value: '42', label: 'Componentes' },
                { value: '0%', label: 'Bordas 1px' },
                { value: '∞', label: 'Escalabilidade' },
              ].map((stat) => (
                <div key={stat.label}>
                  <span className="block text-4xl font-black font-headline text-amber-500">
                    {stat.value}
                  </span>
                  <span
                    className="font-label uppercase tracking-widest"
                    style={{ fontSize: '10px', color: '#d7c3af' }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}
