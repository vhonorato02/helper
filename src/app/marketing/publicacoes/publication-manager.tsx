'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  changeMarketingPublicationStatus,
  createMarketingPublication,
} from '@/actions/marketing-publications';

type PublicationItem = {
  id: string;
  title: string;
  caption: string | null;
  channels: string[];
  assetUrls: string[];
  status: string;
  scheduledFor: string | null;
  publishedUrls: Record<string, string>;
  failureReason: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', review: 'Em revisão', approved: 'Aprovado',
  scheduled: 'Agendado', published: 'Publicado', failed: 'Falhou',
};
const NEXT_ACTIONS: Record<string, Array<{ status: string; label: string }>> = {
  draft: [{ status: 'review', label: 'Enviar para revisão' }],
  review: [{ status: 'draft', label: 'Pedir ajustes' }, { status: 'approved', label: 'Aprovar' }],
  approved: [{ status: 'draft', label: 'Retirar aprovação' }],
  scheduled: [{ status: 'approved', label: 'Cancelar agendamento' }],
  failed: [{ status: 'approved', label: 'Preparar nova tentativa' }],
  published: [],
};

export function PublicationManager({ items }: { items: PublicationItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createMarketingPublication(formData);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success('Rascunho editorial criado.');
      formRef.current?.reset();
      router.refresh();
    });
  }

  function transition(id: string, status: string) {
    startTransition(async () => {
      const result = await changeMarketingPublicationStatus(id, status);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success('Fluxo editorial atualizado.');
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.7fr)]">
      <form ref={formRef} action={submit} className="surface-panel h-fit space-y-4 rounded-lg p-5">
        <div><h2 className="font-bold">Novo conteúdo</h2><p className="text-sm text-muted-foreground">Tudo nasce como rascunho e exige revisão.</p></div>
        <div className="space-y-1.5"><Label htmlFor="publication-title">Título</Label><Input id="publication-title" name="title" maxLength={160} required disabled={pending} /></div>
        <div className="space-y-1.5"><Label htmlFor="publication-caption">Legenda</Label><Textarea id="publication-caption" name="caption" maxLength={10000} disabled={pending} /></div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Canais</legend><div className="flex flex-wrap gap-3">{['Instagram','Facebook','LinkedIn','TikTok','YouTube','Threads'].map((channel) => <label key={channel} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="channels" value={channel.toLowerCase()} disabled={pending} />{channel}</label>)}</div></fieldset>
        <div className="space-y-1.5"><Label htmlFor="publication-assets">Links dos arquivos, um por linha</Label><Textarea id="publication-assets" name="assetUrls" placeholder="https://..." disabled={pending} /></div>
        <div className="space-y-1.5"><Label htmlFor="publication-date">Data pretendida</Label><Input id="publication-date" name="scheduledFor" type="datetime-local" disabled={pending} /></div>
        <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Criar rascunho'}</Button>
      </form>

      <section className="space-y-3">
        {items.length === 0 ? <div className="surface-panel rounded-lg p-10 text-center text-sm text-muted-foreground">Nenhuma publicação no pipeline.</div> : items.map((item) => (
          <article key={item.id} className="surface-panel rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.channels.join(' · ') || 'Canais ainda não definidos'}</p></div><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{STATUS_LABELS[item.status] ?? item.status}</span></div>
            {item.caption && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.caption}</p>}
            {item.failureReason && <p className="mt-3 text-sm text-destructive">Falha: {item.failureReason}</p>}
            {Object.keys(item.publishedUrls).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{Object.entries(item.publishedUrls).map(([channel,url]) => <a key={channel} href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{channel}</a>)}</div>}
            <div className="mt-4 flex flex-wrap gap-2">{(NEXT_ACTIONS[item.status] ?? []).map((action) => <Button key={action.status} type="button" size="sm" variant={action.status === 'approved' ? 'default' : 'outline'} disabled={pending} onClick={() => transition(item.id, action.status)}>{action.label}</Button>)}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
