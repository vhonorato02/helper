export const AREA_OPTIONS = [
  { value: 'TI', label: 'TI' },
  { value: 'MKT', label: 'Marketing' },
] as const;

export const AREA_LABELS = {
  TI: 'TI',
  MKT: 'Marketing',
} as const;

export const SUBCATEGORIES = {
  TI: [
    'Rede',
    'Computador',
    'Impressora',
    'Projetor',
    'Som',
    'Software',
    'Acesso',
    'Outro',
  ],
  MKT: [
    'Post Instagram',
    'Comunicado para famílias',
    'Arte impressa',
    'Vídeo',
    'Evento',
    'Fotografia',
    'Site',
    'Outro',
  ],
} as const;

export const TI_SUBCATEGORIES = SUBCATEGORIES.TI;
export const MKT_SUBCATEGORIES = SUBCATEGORIES.MKT;

export const STATUS_META = {
  aberto: {
    label: 'Aberto',
    historyLabel: 'aberto',
    tone: 'neutral',
  },
  em_andamento: {
    label: 'Em andamento',
    historyLabel: 'em andamento',
    tone: 'info',
  },
  aguardando: {
    label: 'Aguardando',
    historyLabel: 'aguardando',
    tone: 'warning',
  },
  resolvido: {
    label: 'Resolvido',
    historyLabel: 'resolvido',
    tone: 'success',
  },
  arquivado: {
    label: 'Arquivado',
    historyLabel: 'arquivado',
    tone: 'muted',
  },
} as const;

export const PRIORITY_META = {
  baixa: {
    label: 'Baixa',
    historyLabel: 'baixa',
    tone: 'success',
  },
  media: {
    label: 'Média',
    historyLabel: 'média',
    tone: 'warning',
  },
  alta: {
    label: 'Alta',
    historyLabel: 'alta',
    tone: 'orange',
  },
  urgente: {
    label: 'Urgente',
    historyLabel: 'urgente',
    tone: 'danger',
  },
} as const;

export const STATUS_LABELS = {
  aberto: STATUS_META.aberto.label,
  em_andamento: STATUS_META.em_andamento.label,
  aguardando: STATUS_META.aguardando.label,
  resolvido: STATUS_META.resolvido.label,
  arquivado: STATUS_META.arquivado.label,
} as const;

export const PRIORITY_LABELS = {
  baixa: PRIORITY_META.baixa.label,
  media: PRIORITY_META.media.label,
  alta: PRIORITY_META.alta.label,
  urgente: PRIORITY_META.urgente.label,
} as const;

export const STATUS_ORDER = [
  'aberto',
  'em_andamento',
  'aguardando',
  'resolvido',
  'arquivado',
] as const;

export const BOARD_STATUSES = [
  'aberto',
  'em_andamento',
  'aguardando',
  'resolvido',
] as const;

export const PRIORITY_ORDER = ['urgente', 'alta', 'media', 'baixa'] as const;

export const STATUS_TRANSITIONS = {
  aberto: ['em_andamento', 'aguardando', 'resolvido', 'arquivado'],
  em_andamento: ['aguardando', 'resolvido', 'arquivado', 'aberto'],
  aguardando: ['em_andamento', 'resolvido', 'arquivado', 'aberto'],
  resolvido: ['aberto', 'arquivado'],
  arquivado: ['aberto'],
} as const;

export const HISTORY_FIELD_LABELS = {
  status: 'status',
  priority: 'prioridade',
  responsavel: 'responsável',
  assigneeId: 'responsável',
  title: 'título',
  description: 'descrição',
  origin: 'origem',
  subcategory: 'subcategoria',
  comment_added: 'comentário',
  comment_edited: 'comentário',
  comment_deleted: 'comentário',
} as const;

export const HISTORY_VALUE_LABELS = {
  ...STATUS_LABELS,
  ...PRIORITY_LABELS,
} as const;

export type Area = keyof typeof AREA_LABELS;
export type Status = keyof typeof STATUS_LABELS;
export type Priority = keyof typeof PRIORITY_LABELS;

export function getSubcategories(area: Area) {
  return SUBCATEGORIES[area];
}

export function isValidSubcategory(area: Area, subcategory: string) {
  return (SUBCATEGORIES[area] as readonly string[]).includes(subcategory);
}
