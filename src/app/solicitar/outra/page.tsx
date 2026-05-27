import { PublicPageShell } from '../_components/public-page-shell';
import { PublicRequestForm } from '../_components/public-request-form';

export const metadata = { title: 'Outra solicitação' };

export default function PublicOtherRequestPage() {
  return (
    <PublicPageShell
      eyebrow="Outra solicitação"
      title="Enviar outra solicitação"
      description="Use este formulário para pedidos que não se encaixam nos tipos anteriores."
    >
      <PublicRequestForm
        kind="outra"
        titleLabel="Resumo do pedido"
        titlePlaceholder="Ex: Verificar interfone do portao"
        descriptionLabel="Detalhes"
        descriptionPlaceholder="Explique o pedido, o contexto e qualquer prazo importante."
      />
    </PublicPageShell>
  );
}
