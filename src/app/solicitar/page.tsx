import Link from 'next/link';
import {
  ArrowRight,
  Brush,
  Camera,
  CircleHelp,
  Clapperboard,
  FileCheck2,
  Laptop2,
  MessageCircle,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';

export const metadata = {
  title: 'Solicitações públicas',
};

const options = [
  {
    href: '/solicitar/chromebooks',
    title: 'Reservar Chromebooks',
    description: 'Data, sala, horário e quantidade.',
    icon: Laptop2,
  },
  {
    href: '/solicitar/ti',
    title: 'Suporte de TI',
    description: 'Computador, internet, projetor, impressora ou acesso.',
    icon: Wrench,
  },
  {
    href: '/solicitar/midia',
    title: 'Fotos e vídeos',
    description: 'Registro de atividades, aulas e projetos.',
    icon: Camera,
  },
  {
    href: '/solicitar/arte',
    title: 'Arte e divulgação',
    description: 'Posts, comunicados, mural e materiais impressos.',
    icon: Brush,
  },
  {
    href: '/solicitar/cobertura',
    title: 'Cobertura de evento',
    description: 'Foto, vídeo ou apoio de comunicação em eventos.',
    icon: Clapperboard,
  },
  {
    href: '/solicitar/outra',
    title: 'Outra solicitação',
    description: 'Pedidos que não se encaixam nos tipos acima.',
    icon: CircleHelp,
  },
];

export default function PublicRequestHubPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg">
            <BrandMark className="size-9 rounded-lg shadow-md shadow-primary/20" />
            <div>
              <p className="text-sm font-bold leading-tight">Helper</p>
              <p className="text-xs text-muted-foreground">Solicitações</p>
            </div>
          </Link>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Acesso interno
          </Link>
        </header>

        <section className="page-hero">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Como podemos ajudar?</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Escolha o tipo de pedido. Cada envio gera protocolo, entra na fila interna e precisa de contato para retorno.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: 'Protocolo no envio',
              description: 'O código confirma que a solicitação entrou no Helper.',
              icon: FileCheck2,
            },
            {
              title: 'Contato obrigatório',
              description: 'A equipe usa e-mail ou telefone para tirar dúvidas e devolver status.',
              icon: MessageCircle,
            },
            {
              title: 'Triagem interna',
              description: 'Pedidos públicos aparecem para a equipe como entrada externa.',
              icon: ShieldCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-border/70 bg-muted/25 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="size-4 text-primary" />
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.href}
                href={option.href}
                className="surface-panel group flex min-h-[116px] items-start gap-3 rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </section>
      </main>
    </div>
  );
}
