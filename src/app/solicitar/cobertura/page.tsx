import { PublicPageShell } from '../_components/public-page-shell';
import { PublicRequestForm } from '../_components/public-request-form';

export const metadata = { title: 'Solicitar cobertura de evento' };

export default function PublicEventCoverageRequestPage() {
  return (
    <PublicPageShell
      eyebrow="Cobertura de evento"
      title="Solicitar cobertura de evento"
      description="Peça apoio de foto, vídeo ou comunicação para eventos internos e institucionais."
    >
      <PublicRequestForm
        kind="cobertura"
        titleLabel="Nome do evento"
        titlePlaceholder="Ex: Feira Cultural"
        descriptionLabel="Detalhes da cobertura"
        descriptionPlaceholder="Informe programação, momentos importantes, responsáveis e entregas esperadas."
        channelLabel="Entregas esperadas"
        channelPlaceholder="Ex: fotos para redes, vídeo curto, registro completo"
        showSchedule
      />
    </PublicPageShell>
  );
}
