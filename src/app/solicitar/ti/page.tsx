import { PublicPageShell } from '../_components/public-page-shell';
import { PublicRequestForm } from '../_components/public-request-form';

export const metadata = { title: 'Solicitar suporte de TI' };

export default function PublicTiRequestPage() {
  return (
    <PublicPageShell
      eyebrow="Suporte de TI"
      title="Solicitar suporte de TI"
      description="Envie problemas de computador, projetor, internet, impressora, contas ou outros recursos de tecnologia."
    >
      <PublicRequestForm
        kind="ti"
        titleLabel="Resumo do problema"
        titlePlaceholder="Ex: Projetor da sala 12 não liga"
        descriptionLabel="Descreva o que aconteceu"
        descriptionPlaceholder="Inclua equipamento, sala, quando o problema comecou e qualquer mensagem de erro."
        showSchedule
      />
    </PublicPageShell>
  );
}
