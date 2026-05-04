interface OverviewProps {
  onNavigate: (path: string) => void
}

const modules = [
  {
    num: '01',
    title: 'Dashboard',
    tag: 'Painel de Controle',
    path: '/',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuK-MdOPJBJX1tCpcVekFlEcgYwEVGrcvV5BXAToC2ofMVCbh6z6o9A44w-_DyWIQvgZTW_SymMw-VW9VFRWU0x6NhvDJQcCv_pJXbSEBODd2ZqeYUQolxsuZBWqFbnFTw8Gxo1pZh2Bnw_hQsBdWHel_mVAT2t4RFUitAYitsGxwmYnpuodSHAqQXfxw3rQ0UEYKC245B-TwGRfJ_YsOBI3RrlcCuLpNNXsACRZAmLKFGKRWs2lCctoynKzog3j9SsB5TLg9FzfU',
  },
  {
    num: '02',
    title: 'Clientes',
    tag: 'CRM de Logística',
    path: '/customers',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDy7v8xALXzwKjynNhuSAbwGexYVCp_0R_94vj7w78zvsLy3Rk1Cvwy8CUyLbYccc3vvEPbZrtPB_8eyTUnJBXfL_CUxl3BFdJu2K0sXqt3khxT6ZSNm0DJ0wMINaJT5ab2OX35un-UhUTpdBknueWUnIm8n3cUHNDCvvqtQm_EdT1DA6ozeGJ6BREsCe2c4BJwyb5pijAX422Jt9Va47gRaClTsvWgwxps1Mg6fkze6Wl6vCzIHGNGvIMfT4gU58axvaROZBYxTcI',
  },
  {
    num: '03',
    title: 'Produtos',
    tag: 'Catálogo de Cargas',
    path: '/products',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1yauhYm6Y-Pzh_MS4NQAXGu7ajbpibdMHjTzK_CvMvYvASrQqO51j-9ZLNiEAbBtkYo-lRS_jq2prViFoHcDeXRyvj4BdyOwIsnTim4psAGtlnowTZs9wq8WHvEtq0x2onxuiEIE3H6zq9W6rzX2L3jhLqiT4urT7Spjpgi7Pqft3b9d6-6p-Vr0ejoeBwyK7CrtVjoYu4dXeLhKBCPxJi8ExmKO51kbeUTYZPGlQ5gj19TH0pwmLeVV15Xws8-D83_j24mHSE0s',
  },
  {
    num: '04',
    title: 'Fornecedores',
    tag: 'Rede de Suprimentos',
    path: '/suppliers',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEIH64FFMmMtnqFhiG0CnrXkakfuLY2oUf0tSScUzhBYF34Zbdc7r9VnbzvwRARZ2XJZ7n3qXz5o3av-BULxxPTW-0W1n13WVZY0ubjb_ok9s8fTaL0YidBRPkU1-SlEpXv2y-ybibVp7HYTJ8SUwVbrx2bkrqH03I2gv-eIt78Hz4-eZ7ftm-FGyGdkunOZYIYW07pgX4JuB6chPyUvGqjk3a1CLr30ztwkqKJdzjnthHllwzTWBbaT3sRT-7nQOtXs3Mt9rAQlA',
  },
  {
    num: '05',
    title: 'Frota',
    tag: 'Gestão de Veículos',
    path: '/trucks',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWEwN9DDl3lNojSqkSHN_XzwQFLnzn5tmg0HKbkbO1JI-FL--BRE3CIYbml7TZc-s2r8fnCY2qI3xC0-JkdWa4XotpKn9FLfoiGzNVkMC6aeHjeTf_KqVQ8mlsyqeF4nb8xKWWongUB9LowSGzTPrr4G5uaBeE2Imb_mpiX-WBpc3RsfKG9tPWRPKrIWqL8JUaiY4VQpjtN4xZzo1v7OWQ7aUEgnK66Gc5VEDK69DCEPVt-HMC5ZynC4cpddIZHLJttz_KjWqmomk',
  },
  {
    num: '06',
    title: 'Nova Viagem',
    tag: 'Escalonamento',
    path: '/trips',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWPPKJ5w2doVVzW3GvOvR1mkOk_zMawdsJhhN-yP1dFUXDixaoeTGJKgp2oFfp1wsqblpxPwPDPnNgYZHoszNmqAtlsYnArjr4A50GdCNLJFDB4wgeLyCWciQ4Gm-G4zevJmcGvK-kB3XK0MNxzd0cZnKQhYF4myE9_wRRsysvy2TRLun7-UxG7XZcmAKZ1SLa1T9LPT-gLSsP74L9nwZvqDOCZeV21fOVoIWqXZchS2oFUZQw9-xf3o1ho8-EhlM-XoDVOKuw_Us',
  },
  {
    num: '07',
    title: 'Custos',
    tag: 'Financeiro & Margem',
    path: '/costs',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBl-TIHU_mmIMJxK8b72rrtjmSIM58xZUR1WBux_6Wdl61EOfjUAXhCYdkefeDe2qbBqXFTYc07HrCHoOJiQi33eytLU9D0aKXTIvHo6erUePCZqEwqonifyvVNr3Woswft84Sa-N2z8qd7gWsPpsqUcINOzTBtjWG2rRNVR8-3CxxtO2rFry489cu9d9b264CeBssSv217SAJeR4ZpGrfrZbfVoi4OgFyUuMke1dLLksWN8o7W3Q-580dX5HrwiY2C9Dk4djH-aS8',
  },
]

export function OverviewPage({ onNavigate }: OverviewProps) {
  return (
    <div className="p-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
          Dezem Transportes
        </span>
        <h1 className="text-4xl font-black font-headline tracking-tighter text-on-surface">
          Visão Geral
        </h1>
        <p className="text-on-surface-variant mt-1">Selecione um módulo para iniciar</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {modules.map((mod) => (
          <button
            key={mod.num}
            type="button"
            className="group text-left bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 transition-all hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
            onClick={() => onNavigate(mod.path)}
          >
            <div className="relative aspect-video overflow-hidden">
              <img
                src={mod.img}
                alt={mod.title}
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-60 group-hover:opacity-100 scale-105 group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-6">
                <span className="text-primary font-headline font-black text-4xl opacity-40 group-hover:opacity-100 transition-opacity">
                  {mod.num}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-xl font-bold font-headline text-on-surface group-hover:text-primary transition-colors">
                  {mod.title}
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
                {mod.tag}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer Stats */}
      <footer className="mt-24 pt-12 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
            Resumo do Sistema
          </p>
          <h4 className="text-2xl font-bold font-headline tracking-tight text-on-surface">
            Um sistema integrado para a nova era da logística.
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
          {[
            { value: '10', label: 'Módulos' },
            { value: '42', label: 'Relatórios' },
            { value: '∞', label: 'Dados' },
          ].map((stat) => (
            <div key={stat.label}>
              <span className="block text-4xl font-black font-headline text-primary">
                {stat.value}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
