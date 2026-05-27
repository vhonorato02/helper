import { getChromebookSettings } from '@/actions/chromebooks';
import { PublicChromebookRequestForm } from '@/app/chromebooks/solicitar/request-form';
import { DEFAULT_CHROMEBOOK_TOTAL } from '@/lib/chromebooks';
import { PublicPageShell } from '../_components/public-page-shell';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Solicitar Chromebooks' };

export default async function PublicChromebookRequestPage() {
  let totalChromebooks = DEFAULT_CHROMEBOOK_TOTAL;
  try {
    const settings = await getChromebookSettings();
    totalChromebooks = settings.totalChromebooks;
  } catch {
    // Keep the public form renderable during local setup before DATABASE_URL exists.
  }

  return (
    <PublicPageShell
      eyebrow="Chromebooks"
      title="Solicitar Chromebooks"
      description="Informe data, horário, sala e quantidade. O sistema valida conflito de sala, disponibilidade e calendário institucional."
    >
      <PublicChromebookRequestForm totalChromebooks={totalChromebooks} />
    </PublicPageShell>
  );
}
