import type { Area, Priority } from '@/lib/constants';

export type TicketTemplate = {
  id: string;
  area: Area;
  label: string;
  subcategory: string;
  title: string;
  priority: Priority;
  description?: string;
  location?: string;
};

export const TICKET_TEMPLATES: TicketTemplate[] = [
  // TI
  {
    id: 'ti-projetor-sala',
    area: 'TI',
    label: 'Projetor não liga',
    subcategory: 'Projetor',
    title: 'Projetor da sala XX não liga',
    priority: 'alta',
    description:
      'Cheguei na sala e o projetor não responde ao controle/botão. Tomada com energia? Cabo HDMI conectado? Lâmpada acesa no equipamento?',
  },
  {
    id: 'ti-internet-lenta',
    area: 'TI',
    label: 'Internet lenta/instável',
    subcategory: 'Rede',
    title: 'Internet lenta/sem acesso',
    priority: 'media',
    description:
      'Quais salas/setores estão afetados? Por cabo ou wifi? Desde quando começou? Outros dispositivos no mesmo local funcionam?',
  },
  {
    id: 'ti-impressora',
    area: 'TI',
    label: 'Impressora com problema',
    subcategory: 'Impressora',
    title: 'Impressora não imprime',
    priority: 'media',
    description: 'Marca/modelo da impressora, mensagem de erro (se aparecer), papel/toner ok?',
  },
  {
    id: 'ti-acesso',
    area: 'TI',
    label: 'Solicitação de acesso/senha',
    subcategory: 'Acesso',
    title: 'Solicitação de acesso a sistema',
    priority: 'baixa',
    description: 'Qual sistema? Qual usuário? Permissões necessárias?',
  },
  {
    id: 'ti-pc',
    area: 'TI',
    label: 'Computador não liga / travando',
    subcategory: 'Computador',
    title: 'Computador da sala XX com problema',
    priority: 'alta',
    description:
      'Sintomas: não liga / liga mas trava / tela azul / lentidão extrema? Aconteceu de repente?',
  },

  // MKT
  {
    id: 'mkt-post-instagram',
    area: 'MKT',
    label: 'Post no Instagram',
    subcategory: 'Post Instagram',
    title: 'Post para Instagram — [TEMA]',
    priority: 'media',
    description:
      'Briefing:\n- Tema:\n- Data de publicação:\n- Público-alvo:\n- Tom (sério, descontraído, informativo):\n- Chamada para ação:\n- Materiais de apoio (fotos, vídeos):',
  },
  {
    id: 'mkt-comunicado',
    area: 'MKT',
    label: 'Comunicado para famílias',
    subcategory: 'Comunicado para famílias',
    title: 'Comunicado — [ASSUNTO]',
    priority: 'alta',
    description:
      'Para qual público (todos / fundamental / médio / pais novos)? Texto-base ou pontos-chave? Canal (WhatsApp / e-mail / app)?',
  },
  {
    id: 'mkt-arte-impressa',
    area: 'MKT',
    label: 'Arte impressa (cartaz, panfleto)',
    subcategory: 'Arte impressa',
    title: 'Arte para [EVENTO/CAMPANHA]',
    priority: 'media',
    description:
      'Formato (A4, A3, panfleto)? Quantidade? Onde será impresso/distribuído? Texto e imagens já definidos?',
  },
  {
    id: 'mkt-evento',
    area: 'MKT',
    label: 'Cobertura de evento',
    subcategory: 'Evento',
    title: 'Cobertura — [NOME DO EVENTO]',
    priority: 'media',
    description: 'Data, horário e local. Foto/vídeo? Quem vai cobrir? Deliverables (post, reels, álbum)?',
  },
  {
    id: 'mkt-video',
    area: 'MKT',
    label: 'Vídeo institucional',
    subcategory: 'Vídeo',
    title: 'Vídeo sobre [TEMA]',
    priority: 'media',
    description: 'Duração desejada, onde será veiculado, roteiro/depoimentos, prazo de entrega.',
  },

  // PF
  {
    id: 'pf-camera',
    area: 'PF',
    label: 'Câmera com problema',
    subcategory: 'Câmera',
    title: 'Câmera da [LOCAL] com problema',
    priority: 'alta',
    description: 'Sintoma: sem imagem / imagem ruim / ângulo desregulado / sem gravação?',
    location: 'Portaria',
  },
  {
    id: 'pf-dvr',
    area: 'PF',
    label: 'DVR/NVR não gravando',
    subcategory: 'DVR/NVR',
    title: 'DVR não está gravando',
    priority: 'urgente',
    description:
      'Quais câmeras estão sem gravação? Mensagem de erro no DVR? HD com espaço? Última gravação válida quando?',
  },
  {
    id: 'pf-alarme',
    area: 'PF',
    label: 'Alarme falhando',
    subcategory: 'Alarme',
    title: 'Alarme da [LOCAL] com defeito',
    priority: 'urgente',
    description: 'Disparando sozinho / não dispara / bateria fraca / sirene não toca?',
  },
  {
    id: 'pf-portao',
    area: 'PF',
    label: 'Portão eletrônico',
    subcategory: 'Portão eletrônico',
    title: 'Portão eletrônico [ENTRADA/SAÍDA]',
    priority: 'alta',
    description: 'Não abre / não fecha / barulho estranho / controle não funciona?',
  },
  {
    id: 'pf-interfone',
    area: 'PF',
    label: 'Interfone',
    subcategory: 'Interfone',
    title: 'Interfone da [LOCAL]',
    priority: 'media',
    description: 'Sem áudio / sem vídeo / botão não funciona / interferência?',
  },
];

export function getTemplatesByArea(area: Area): TicketTemplate[] {
  return TICKET_TEMPLATES.filter((t) => t.area === area);
}
