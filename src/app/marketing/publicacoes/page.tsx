import { redirect } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import { auth } from '@/auth';
import { getMarketingPublications } from '@/actions/marketing-publications';
import { PublicationManager } from './publication-manager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Publicações' };

export default async function MarketingPublicationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const publications = await getMarketingPublications();
  return (
    <div className="space-y-6">
      <div className="page-hero"><div className="flex items-center gap-2"><Megaphone className="size-5 text-primary" /><h1 className="text-2xl font-bold tracking-tight">Pipeline de publicações</h1></div><p className="mt-1 text-sm text-muted-foreground">Rascunho, revisão humana, aprovação, agendamento e resultado em cada rede.</p></div>
      <PublicationManager items={publications.map((item) => ({ ...item, scheduledFor: item.scheduledFor?.toISOString() ?? null }))} />
    </div>
  );
}
