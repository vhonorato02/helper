import { PublicPageShell } from '../_components/public-page-shell';
import { PublicRequestForm } from '../_components/public-request-form';

export const metadata = { title: 'Solicitar arte e divulgação' };

export default function PublicDesignRequestPage() {
  return (
    <PublicPageShell
      eyebrow="Arte e divulgação"
      title="Solicitar arte ou divulgação"
      description="Envie pedidos de post, comunicado, mural, material impresso ou apoio de divulgação."
    >
      <PublicRequestForm
        kind="arte"
        titleLabel="Tema da arte"
        titlePlaceholder="Ex: Reunião de pais do Ensino Médio"
        descriptionLabel="Texto base e orientações"
        descriptionPlaceholder="Informe texto, público-alvo, formato desejado e prazo."
        channelLabel="Canais desejados"
        channelPlaceholder="Ex: Instagram, WhatsApp, mural, impresso"
        showSchedule
      />
    </PublicPageShell>
  );
}
