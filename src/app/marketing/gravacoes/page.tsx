import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Inbox, Video } from 'lucide-react';
import { auth } from '@/auth';
import { copy } from '@/lib/copy';
import { getRecordings } from '@/actions/recordings';
import { getActiveUsersForAssignment } from '@/actions/users';
import { NewRecordingButton, RecordingItem, type RecordingRow } from '../recording-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gravações',
};

function groupRecordings(recordings: RecordingRow[]) {
  const now = new Date();
  const upcoming: RecordingRow[] = [];
  const completed: RecordingRow[] = [];
  const archived: RecordingRow[] = [];

  for (const r of recordings) {
    if (r.status === 'cancelada') {
      archived.push(r);
      continue;
    }
    if (r.status === 'gravada' || r.status === 'publicada') {
      completed.push(r);
      continue;
    }
    const d = new Date(r.scheduledDate);
    if (d < now) completed.push(r);
    else upcoming.push(r);
  }

  return { upcoming, completed, archived };
}

function Group({
  title,
  recordings,
  users,
}: {
  title: string;
  recordings: RecordingRow[];
  users: { id: string; displayName: string }[];
}) {
  if (recordings.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
        {title}
      </h2>
      <div className="space-y-2.5">
        {recordings.map((r) => (
          <RecordingItem key={r.id} recording={r} users={users} />
        ))}
      </div>
    </section>
  );
}

export default async function RecordingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [recordings, users] = await Promise.all([
    getRecordings(),
    getActiveUsersForAssignment(),
  ]);

  const { upcoming, completed, archived } = groupRecordings(recordings);
  const isEmpty = recordings.length === 0;

  return (
    <div className="space-y-7">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/marketing"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            {copy.marketing.page.title}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <Video className="size-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              {copy.marketing.recordings.title}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.marketing.recordings.description}
          </p>
        </div>
        <NewRecordingButton users={users} />
      </div>

      {isEmpty ? (
        <div className="surface-elevated rounded-xl py-20 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted/60">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <p className="font-semibold">{copy.marketing.recordings.empty}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {copy.marketing.recordings.emptyHint}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <Group
            title={copy.marketing.recordings.groups.upcoming}
            recordings={upcoming}
            users={users}
          />
          <Group
            title={copy.marketing.recordings.groups.completed}
            recordings={completed}
            users={users}
          />
          <Group
            title={copy.marketing.recordings.groups.archived}
            recordings={archived}
            users={users}
          />
        </div>
      )}
    </div>
  );
}
