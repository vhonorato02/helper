import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const areaEnum = pgEnum('area', ['TI', 'MKT', 'PF']);
export const scheduleStatusEnum = pgEnum('schedule_status', ['pendente', 'concluido', 'cancelado']);
export const chromebookBookingStatusEnum = pgEnum('chromebook_booking_status', [
  'pendente',
  'confirmado',
  'cancelado',
]);
export const recordingStatusEnum = pgEnum('recording_status', [
  'planejada',
  'confirmada',
  'gravada',
  'publicada',
  'cancelada',
]);
export const marketingEventCategoryEnum = pgEnum('marketing_event_category', [
  'comemorativa',
  'civica',
  'religiosa',
  'escolar',
  'campanha',
]);
export const priorityEnum = pgEnum('priority', ['baixa', 'media', 'alta', 'urgente']);
export const statusEnum = pgEnum('status', [
  'aberto',
  'em_andamento',
  'aguardando',
  'resolvido',
  'arquivado',
]);
export const authEventTypeEnum = pgEnum('auth_event_type', [
  'login_success',
  'login_failure',
  'login_rate_limited',
  'password_changed',
  'admin_reset_password',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').unique().notNull(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  passwordChangedAt: timestamp('password_changed_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subcategories = pgTable(
  'subcategories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    area: areaEnum('area').notNull(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').default(100).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('subcategories_area_label_idx').on(t.area, t.label),
    index('subcategories_active_idx').on(t.area, t.isActive, t.sortOrder),
  ],
);

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').unique().notNull(),
    area: areaEnum('area').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    subcategory: text('subcategory').notNull(),
    origin: text('origin'),
    publicContact: text('public_contact'),
    location: text('location'),
    priority: priorityEnum('priority').default('media').notNull(),
    status: statusEnum('status').default('aberto').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    dueDate: timestamp('due_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
  },
  (t) => [
    index('tickets_area_idx').on(t.area),
    index('tickets_status_idx').on(t.status),
    index('tickets_priority_idx').on(t.priority),
    index('tickets_assignee_idx').on(t.assigneeId),
    index('tickets_created_idx').on(t.createdAt),
    index('tickets_due_idx').on(t.dueDate),
  ],
);

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .references(() => tickets.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ticketHistory = pgTable('ticket_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .references(() => tickets.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ticketMentions = pgTable(
  'ticket_mentions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    seenAt: timestamp('seen_at'),
  },
  (t) => [
    index('mentions_user_idx').on(t.userId, t.seenAt),
    index('mentions_ticket_idx').on(t.ticketId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    link: text('link'),
    ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('notifications_user_unread_idx').on(t.userId, t.readAt),
    index('notifications_created_idx').on(t.createdAt),
  ],
);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  ticketCreated: boolean('ticket_created').default(true).notNull(),
  ticketStatus: boolean('ticket_status').default(true).notNull(),
  commentMention: boolean('comment_mention').default(true).notNull(),
  dailyDigest: boolean('daily_digest').default(true).notNull(),
  emailEnabled: boolean('email_enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    scheduledDate: timestamp('scheduled_date').notNull(),
    area: areaEnum('area'),
    status: scheduleStatusEnum('status').default('pendente').notNull(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('schedules_date_idx').on(t.scheduledDate),
    index('schedules_status_idx').on(t.status),
    index('schedules_area_idx').on(t.area),
  ],
);

export const chromebookSettings = pgTable('chromebook_settings', {
  id: text('id').primaryKey().default('default'),
  totalChromebooks: integer('total_chromebooks').default(30).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chromebookBookings = pgTable(
  'chromebook_bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),
    quantity: integer('quantity').notNull(),
    room: text('room').notNull(),
    requesterName: text('requester_name').notNull(),
    requesterContact: text('requester_contact'),
    protocol: text('protocol'),
    notes: text('notes'),
    status: chromebookBookingStatusEnum('status').default('pendente').notNull(),
    responsibleId: uuid('responsible_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('chromebook_bookings_start_idx').on(t.startAt),
    index('chromebook_bookings_end_idx').on(t.endAt),
    index('chromebook_bookings_status_idx').on(t.status),
    index('chromebook_bookings_room_idx').on(t.room),
    index('chromebook_bookings_responsible_idx').on(t.responsibleId),
  ],
);

export const chromebookBookingLocks = pgTable('chromebook_booking_locks', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const recordings = pgTable(
  'recordings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    pauta: text('pauta'),
    scheduledDate: timestamp('scheduled_date').notNull(),
    durationMinutes: integer('duration_minutes'),
    location: text('location'),
    participants: text('participants'),
    equipment: text('equipment'),
    publishChannel: text('publish_channel'),
    status: recordingStatusEnum('status').default('planejada').notNull(),
    responsibleId: uuid('responsible_id').references(() => users.id, { onDelete: 'set null' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('recordings_date_idx').on(t.scheduledDate),
    index('recordings_status_idx').on(t.status),
    index('recordings_responsible_idx').on(t.responsibleId),
  ],
);

export const marketingEvents = pgTable(
  'marketing_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    month: integer('month').notNull(),
    day: integer('day').notNull(),
    category: marketingEventCategoryEnum('category').default('comemorativa').notNull(),
    leadDays: integer('lead_days').default(7).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(100).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('marketing_events_name_idx').on(t.name, t.month, t.day),
    index('marketing_events_calendar_idx').on(t.month, t.day, t.isActive),
  ],
);

export const authEvents = pgTable(
  'auth_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    username: text('username'),
    type: authEventTypeEnum('type').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    detail: text('detail'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('auth_events_user_idx').on(t.userId, t.createdAt),
    index('auth_events_type_idx').on(t.type, t.createdAt),
  ],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  authoredTickets: many(tickets, { relationName: 'author' }),
  assignedTickets: many(tickets, { relationName: 'assignee' }),
  comments: many(comments),
  history: many(ticketHistory),
  mentions: many(ticketMentions),
  notifications: many(notifications),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  author: one(users, {
    fields: [tickets.authorId],
    references: [users.id],
    relationName: 'author',
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  comments: many(comments),
  history: many(ticketHistory),
  mentions: many(ticketMentions),
  notifications: many(notifications),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  ticket: one(tickets, { fields: [comments.ticketId], references: [tickets.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  mentions: many(ticketMentions),
}));

export const ticketHistoryRelations = relations(ticketHistory, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketHistory.ticketId], references: [tickets.id] }),
  author: one(users, { fields: [ticketHistory.authorId], references: [users.id] }),
}));

export const ticketMentionsRelations = relations(ticketMentions, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketMentions.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketMentions.userId], references: [users.id] }),
  comment: one(comments, { fields: [ticketMentions.commentId], references: [comments.id] }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  author: one(users, { fields: [schedules.authorId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  ticket: one(tickets, { fields: [notifications.ticketId], references: [tickets.id] }),
}));

export const chromebookBookingsRelations = relations(chromebookBookings, ({ one }) => ({
  responsible: one(users, {
    fields: [chromebookBookings.responsibleId],
    references: [users.id],
  }),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  author: one(users, {
    fields: [recordings.authorId],
    references: [users.id],
    relationName: 'recordingAuthor',
  }),
  responsible: one(users, {
    fields: [recordings.responsibleId],
    references: [users.id],
    relationName: 'recordingResponsible',
  }),
  ticket: one(tickets, { fields: [recordings.ticketId], references: [tickets.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type TicketHistory = typeof ticketHistory.$inferSelect;
export type Subcategory = typeof subcategories.$inferSelect;
export type NewSubcategory = typeof subcategories.$inferInsert;
export type AuthEvent = typeof authEvents.$inferSelect;
export type TicketMention = typeof ticketMentions.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type ChromebookSetting = typeof chromebookSettings.$inferSelect;
export type ChromebookBooking = typeof chromebookBookings.$inferSelect;
export type NewChromebookBooking = typeof chromebookBookings.$inferInsert;
export type ChromebookBookingLock = typeof chromebookBookingLocks.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;
export type MarketingEvent = typeof marketingEvents.$inferSelect;
export type NewMarketingEvent = typeof marketingEvents.$inferInsert;
