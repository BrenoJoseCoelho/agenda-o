import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Rota pública: visitante vê a landing; cliente logado vai direto pro painel.
export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.organizationType === "AGENCIA") redirect("/organizacao");
    const business = await prisma.business.findFirst({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "asc" },
    });
    redirect(business ? `/negocios/${business.slug}/painel` : "/organizacao");
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Differentiators />
      <Comparison />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b bd header-bg backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
          Atende AI
        </span>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-2">
          <a href="#como-funciona" className="hover:text-1 transition-colors">Como funciona</a>
          <a href="#comparativo" className="hover:text-1 transition-colors">Comparativo</a>
          <a href="#precos" className="hover:text-1 transition-colors">Preços</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-2 hover:text-1 transition-colors">
            Entrar
          </Link>
          <Link href="/registrar" className="btn-primary text-sm">
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center relative">
        <span className="inline-block text-xs font-medium uppercase tracking-wider text-emerald-500 bg-emerald-400/10 border border-emerald-400/25 px-3 py-1 rounded-full">
          Atendente de IA para WhatsApp
        </span>
        <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight text-1 leading-[1.05]">
          Seu WhatsApp atende, agenda
          <br className="hidden sm:block" /> e{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            vende sozinho
          </span>
          , 24h por dia.
        </h1>
        <p className="mt-6 text-lg text-2 max-w-2xl mx-auto">
          A IA da Atende AI responde na hora, marca horários direto na sua agenda e recupera
          clientes que sumiram. Você dorme — ela continua vendendo.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/registrar" className="btn-primary text-base px-8 py-3">
            Começar grátis
          </Link>
          <a href="#como-funciona" className="btn-ghost text-base px-8 py-3">
            Ver como funciona
          </a>
        </div>
        <p className="mt-4 text-xs text-3">Sem cartão de crédito · Configuração em minutos</p>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { v: "24h", l: "atendendo, todo dia — inclusive fim de semana" },
    { v: "seg", l: "pra responder cada cliente, na hora" },
    { v: "47%", l: "das conversas chegam fora do horário — e ela atende todas" },
  ];
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.l} className="glass rounded-2xl p-5 text-center">
            <div className="text-3xl font-bold text-emerald-500">{s.v}</div>
            <div className="text-xs text-2 mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      t: "Conecte seu WhatsApp",
      d: "Em poucos cliques, sem trocar de número e sem instalar nada.",
    },
    {
      n: "2",
      t: "Ensine a IA (ou mande uma foto)",
      d: "Defina o jeito de falar do seu negócio. Tire uma foto da sua tabela de preços e ela cadastra os serviços sozinha.",
    },
    {
      n: "3",
      t: "Ela atende, agenda e te dá o relatório",
      d: "Responde clientes, marca horários na sua agenda e mostra o que mais vende e quem está sumindo.",
    },
  ];
  return (
    <section id="como-funciona" className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-1">No ar em minutos</h2>
        <p className="text-2 mt-2">Três passos e sua atendente de IA já está trabalhando.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div key={s.n} className="glass rounded-2xl p-6">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-500 font-bold flex items-center justify-center">
              {s.n}
            </div>
            <h3 className="mt-4 font-semibold text-1">{s.t}</h3>
            <p className="mt-1.5 text-sm text-2">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Differentiators() {
  const items = [
    { t: "IA humanizada e sua", d: "Fala com a personalidade do seu negócio — não parece robô. Nada de 'digite 1 para agendar'." },
    { t: "Entende áudio", d: "O cliente manda um áudio? Ela ouve, entende e responde." },
    { t: "Agenda de verdade", d: "Marca no seu Google Calendar e evita horário em cima do outro." },
    { t: "Gerente virtual", d: "Previsão de faturamento do mês, serviços que mais vendem e clientes prestes a sumir." },
    { t: "Recupera quem sumiu", d: "Reengaja sozinha o cliente que não voltou — receita que estava indo embora." },
    { t: "IA de ponta por plano", d: "Usa os melhores modelos de IA do mercado, do essencial ao mais inteligente." },
  ];
  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-1">Não é um chatbot. É uma funcionária.</h2>
        <p className="text-2 mt-2">O que ela faz que os robôs comuns não fazem.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => (
          <div key={i.t} className="glass rounded-2xl p-6">
            <div className="text-emerald-500 text-xl">✓</div>
            <h3 className="mt-3 font-semibold text-1">{i.t}</h3>
            <p className="mt-1.5 text-sm text-2">{i.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Comparison() {
  const cols = ["Atende AI", "Chatbot comum", "App de agenda", "Secretária"];
  const rows: { label: string; values: (boolean | string)[] }[] = [
    { label: "Atende 24h, sem folga", values: [true, "parcial", false, false] },
    { label: "Responde na hora", values: [true, true, false, "depende"] },
    { label: "Entende conversa natural e áudio", values: [true, false, false, true] },
    { label: "Agenda sozinho no seu calendário", values: [true, false, "manual", true] },
    { label: "Fala com a cara do seu negócio", values: [true, false, false, true] },
    { label: "Recupera cliente que sumiu", values: [true, false, false, "raro"] },
    { label: "Relatório de faturamento (gerente virtual)", values: [true, false, "parcial", false] },
    { label: "Custo por mês", values: ["R$ 147", "varia", "R$ 90+", "R$ 1.500+"] },
  ];
  return (
    <section id="comparativo" className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-1">Por que trocar pelo Atende AI</h2>
        <p className="text-2 mt-2">Compare com o que você usa hoje.</p>
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b bd">
                <th className="text-left font-medium text-3 px-4 py-4"> </th>
                {cols.map((c, i) => (
                  <th
                    key={c}
                    className={`px-4 py-4 font-semibold text-center ${
                      i === 0 ? "text-emerald-500" : "text-2"
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-4 py-3 text-2">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 text-center ${i === 0 ? "bg-emerald-400/5" : ""}`}
                    >
                      <Cell value={v} highlight={i === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Cell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (value === true)
    return <span className={highlight ? "text-emerald-500 font-bold" : "text-emerald-500"}>✓</span>;
  if (value === false) return <span className="text-3">—</span>;
  return <span className={`text-xs ${highlight ? "text-emerald-500 font-medium" : "text-3"}`}>{value}</span>;
}

function Pricing() {
  const plans = [
    { name: "Essencial", price: "R$ 147", model: "IA rápida", features: ["Atendimento + agendamento", "1 número de WhatsApp", "Personalização do Cérebro"], featured: false },
    { name: "Profissional", price: "R$ 247", model: "IA avançada", features: ["Tudo do Essencial", "Entende áudios", "Google Calendar", "Gerente virtual"], featured: true },
    { name: "Ilimitado", price: "R$ 447", model: "IA mais inteligente", features: ["Tudo do Profissional", "Alto volume", "Prioridade no suporte"], featured: false },
  ];
  return (
    <section id="precos" className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-1">Planos que se pagam com 1 cliente</h2>
        <p className="text-2 mt-2">Um único agendamento recuperado já cobre o mês.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`glass rounded-2xl p-6 flex flex-col ${p.featured ? "border-emerald-400/40 ring-1 ring-emerald-400/30" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-1">{p.name}</span>
              {p.featured && (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-400/10 text-emerald-500 border border-emerald-400/25 px-2 py-0.5 rounded-full">
                  Mais popular
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-1">{p.price}</span>
              <span className="text-sm text-2">/mês</span>
            </div>
            <div className="text-xs text-emerald-500 mt-1">{p.model}</div>
            <ul className="mt-5 space-y-2 flex-1">
              {p.features.map((f) => (
                <li key={f} className="text-sm text-2 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/registrar"
              className={`mt-6 text-center ${p.featured ? "btn-primary" : "btn-ghost"}`}
            >
              Começar
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const qa = [
    { q: "Preciso de outro número de WhatsApp?", a: "Não. A IA atende no número do seu negócio, do jeito que ele já é." },
    { q: "Funciona pro meu tipo de negócio?", a: "Sim — barbearias, salões, clínicas, estúdios e profissionais autônomos que agendam horário." },
    { q: "E se a IA errar?", a: "Ela confirma o serviço, dia e horário antes de marcar, e você acompanha todas as conversas pelo painel." },
    { q: "Preciso entender de tecnologia?", a: "Não. A configuração leva minutos e dá até pra cadastrar os serviços por foto da sua tabela de preços." },
  ];
  return (
    <section className="max-w-3xl mx-auto px-4 py-20">
      <h2 className="text-3xl font-bold tracking-tight text-1 text-center mb-10">Perguntas frequentes</h2>
      <div className="space-y-3">
        {qa.map((item) => (
          <div key={item.q} className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-1">{item.q}</h3>
            <p className="text-sm text-2 mt-1.5">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div className="glass rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/15 blur-[100px] pointer-events-none" />
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-1 relative">
          Cada mensagem sem resposta é um cliente do concorrente.
        </h2>
        <p className="text-2 mt-4 relative max-w-xl mx-auto">
          Ligue sua atendente de IA hoje e nunca mais perca uma venda por demora.
        </p>
        <div className="mt-8 relative">
          <Link href="/registrar" className="btn-primary text-base px-10 py-3">
            Começar grátis agora
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bd">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-3">
        <span className="font-semibold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
          Atende AI
        </span>
        <span>© {new Date().getFullYear()} Atende AI. Seu WhatsApp trabalhando por você.</span>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-1 transition-colors">Entrar</Link>
          <Link href="/registrar" className="hover:text-1 transition-colors">Criar conta</Link>
        </div>
      </div>
    </footer>
  );
}
