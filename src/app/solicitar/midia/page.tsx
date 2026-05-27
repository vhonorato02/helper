import { PublicPageShell } from '../_components/public-page-shell';
import { PublicRequestForm } from '../_components/public-request-form';

export const metadata = { title: 'Solicitar fotos e vídeos' };

export default function PublicMediaRequestPage() {
  return (
    <PublicPageShell
      eyebrow="Fotos e vídeos"
      title="Solicitar fotos ou vídeos"
      description="Peça registro de atividades, aulas, projetos ou ações institucionais."
    >
      <PublicRequestForm
        kind="midia"
        titleLabel="Nome da atividade"
        titlePlaceholder="Ex: Experimento de ciências do 7º ano"
        descriptionLabel="Briefing"
        descriptionPlaceholder="Conte o que deve ser registrado, quem participa e qual resultado esperado."
        channelLabel="Onde será usado"
        channelPlaceholder="Ex: Instagram, arquivo interno, famílias"
        showSchedule
      />
    </PublicPageShell>
  );
}
