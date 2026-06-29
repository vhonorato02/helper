import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { MessageSquareQuote } from 'lucide-react';
import { getQuickResponses } from '@/actions/quick-responses';
import { copy } from '@/lib/copy';
import { QuickResponsesClient } from './quick-responses-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: copy.quickResponses.page.title,
};

export default async function QuickResponsesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const responses = await getQuickResponses(true);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="page-hero">
        <p className="section-label flex items-center gap-1.5">
          <MessageSquareQuote className="size-3.5" />
          {copy.nav.links.quickResponses}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          {copy.quickResponses.page.title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {copy.quickResponses.page.description}
        </p>
      </header>

      <QuickResponsesClient
        responses={responses}
        currentUserId={session.user.id}
        currentUserIsAdmin={session.user.isAdmin ?? false}
      />
    </div>
  );
}
