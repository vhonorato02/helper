import type { BoardStatus } from '@/lib/constants';
import type { Ticket } from '@/db/schema';

export type KanbanTicket = {
  id: string;
  code: string;
  area: Ticket['area'];
  title: string;
  subcategory: string;
  priority: Ticket['priority'];
  status: BoardStatus;
  createdAt: Date;
  updatedAt: Date;
  assigneeId: string | null;
  assigneeName: string | null;
};
