import { Buffer } from 'node:buffer';
import { connect as connectTls, type TLSSocket } from 'node:tls';
import {
  AREA_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Area,
  type Priority,
  type Status,
} from '@/lib/constants';
import { BRAND } from '@/lib/brand';
import { logger } from '@/lib/logger';

const DEFAULT_EMAIL_TIMEOUT_MS = 6000;

type TicketEmailData = {
  code: string;
  area: Area;
  title: string;
  subcategory: string;
  priority: Priority;
  status: Status;
  origin?: string | null;
};

type NotificationType = 'ticket_created' | 'ticket_status_updated' | 'ticket_comment_added';

type TicketNotificationInput = {
  type: NotificationType;
  ticket: TicketEmailData;
  actorName?: string | null;
  status?: Status;
  commentSnippet?: string | null;
  publicRequest?: boolean;
};

type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

type SmtpMessage = BuiltEmail & {
  fromEmail: string;
  fromName: string;
  to: string[];
};

function normalizeUrl(raw?: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

export function getAppUrl() {
  return (
    normalizeUrl(process.env.APP_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeUrl(process.env.VERCEL_URL) ??
    null
  );
}

function getEmailTimeoutMs() {
  const raw = Number.parseInt(process.env.EMAIL_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EMAIL_TIMEOUT_MS;
}

function parseEmails(raw: string) {
  return raw
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean)
    .filter((email) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) && !/[\r\n]/.test(email));
}

export function getRecipientsForArea(area?: string | null): string[] {
  if (area === 'TI') {
    const tiEmails = process.env.NOTIFICATION_TI_EMAILS;
    if (tiEmails) return parseEmails(tiEmails);
  }
  return parseEmails(process.env.NOTIFICATION_TO_EMAILS ?? '');
}

export function getAllRecipients(): string[] {
  const general = parseEmails(process.env.NOTIFICATION_TO_EMAILS ?? '');
  const ti = parseEmails(process.env.NOTIFICATION_TI_EMAILS ?? '');
  return Array.from(new Set([...general, ...ti]));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function notificationTitle(type: NotificationType, ticket: TicketEmailData, status?: Status) {
  if (type === 'ticket_created') return `Nova demanda ${ticket.code}`;
  if (type === 'ticket_status_updated') {
    return `${ticket.code} atualizado para ${STATUS_LABELS[status ?? ticket.status]}`;
  }
  return `Novo comentario em ${ticket.code}`;
}

function buildTicketUrl(ticketCode: string) {
  const appUrl = getAppUrl();
  return appUrl ? `${appUrl}/tickets/${encodeURIComponent(ticketCode)}` : null;
}

export function buildTicketNotificationEmail(input: TicketNotificationInput): BuiltEmail {
  const { type, ticket, actorName, status, commentSnippet } = input;
  const ticketUrl = buildTicketUrl(ticket.code);
  const title = notificationTitle(type, ticket, status);
  const statusLabel = STATUS_LABELS[status ?? ticket.status];
  const prefix = input.publicRequest ? '[Helper] [PUBLICA]' : '[Helper]';
  const subject =
    type === 'ticket_created'
      ? `${prefix} ${title}: ${ticket.title}`
      : `${prefix} ${title}`;

  const rows = [
    ['Código', ticket.code],
    ['Área', AREA_LABELS[ticket.area]],
    ['Subcategoria', ticket.subcategory],
    ['Prioridade', PRIORITY_LABELS[ticket.priority]],
    ['Status', statusLabel],
    ['Origem', ticket.origin ?? 'Não informada'],
    ['Atualizado por', actorName ?? 'Sistema'],
  ];

  const textLines = [
    title,
    '',
    ticket.title,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(commentSnippet ? ['', `Comentario: ${commentSnippet}`] : []),
    ...(ticketUrl ? ['', `Abrir demanda: ${ticketUrl}`] : []),
  ];

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:${BRAND.mutedText};font-size:13px;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:${BRAND.emailText};font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:${BRAND.emailBg};padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:12px;padding:24px;">
        <p style="margin:0 0 8px;color:${BRAND.emailPrimary};font-size:13px;font-weight:700;">Helper</p>
        <h1 style="margin:0 0 12px;color:${BRAND.emailText};font-size:20px;line-height:1.3;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 18px;color:${BRAND.graphite};font-size:15px;line-height:1.5;">${escapeHtml(ticket.title)}</p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};padding:8px 0;">${htmlRows}</table>
        ${
          commentSnippet
            ? `<p style="margin:18px 0 0;color:${BRAND.graphite};font-size:14px;line-height:1.5;"><strong>Comentario:</strong> ${escapeHtml(commentSnippet)}</p>`
            : ''
        }
        ${
          ticketUrl
            ? `<p style="margin:22px 0 0;"><a href="${escapeHtml(ticketUrl)}" style="display:inline-block;background:${BRAND.emailPrimary};color:${BRAND.white};text-decoration:none;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:700;">Abrir demanda</a></p>`
            : ''
        }
      </div>
    </div>`;

  return { subject, html, text: textLines.join('\n') };
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(safeHeader(value), 'utf8').toString('base64')}?=`;
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

function buildMimeMessage(message: SmtpMessage) {
  const boundary = `helper-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const from = `${safeHeader(message.fromName)} <${message.fromEmail}>`;
  const headers = [
    `From: ${from}`,
    `To: ${message.to.join(', ')}`,
    `Subject: ${encodeHeader(message.subject)}`,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@helper.local>`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(message.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(message.html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

function createSmtpLineReader(socket: TLSSocket) {
  let buffer = '';
  const lines: string[] = [];
  const waiters: Array<{ resolve: (line: string) => void; reject: (error: Error) => void }> = [];
  let failure: Error | null = null;

  const flush = () => {
    while (lines.length > 0 && waiters.length > 0) {
      waiters.shift()?.resolve(lines.shift() ?? '');
    }
  };

  const fail = (error: Error) => {
    failure ??= error;
    while (waiters.length > 0) {
      waiters.shift()?.reject(failure);
    }
  };

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let index = buffer.indexOf('\n');
    while (index >= 0) {
      lines.push(buffer.slice(0, index).replace(/\r$/, ''));
      buffer = buffer.slice(index + 1);
      index = buffer.indexOf('\n');
    }
    flush();
  });

  socket.on('timeout', () => {
    const error = new Error('SMTP timeout');
    fail(error);
    socket.destroy(error);
  });
  socket.on('error', (error) => {
    fail(error);
  });
  socket.on('close', () => {
    if (!failure) fail(new Error('SMTP connection closed'));
  });

  return () =>
    new Promise<string>((resolve, reject) => {
      if (failure) {
        reject(failure);
        return;
      }

      const line = lines.shift();
      if (line !== undefined) {
        resolve(line);
        return;
      }

      waiters.push({ resolve, reject });
    });
}

async function sendSmtpMessage(message: SmtpMessage) {
  const fromEmail = parseEmails(message.fromEmail)[0];
  const recipients = Array.from(new Set(message.to.flatMap((email) => parseEmails(email))));

  if (!fromEmail) throw new Error('SMTP sender is invalid');
  if (recipients.length === 0) throw new Error('SMTP recipients are empty');

  const normalizedMessage = { ...message, fromEmail, to: recipients };
  const socket = connectTls({
    host: 'smtp.gmail.com',
    port: 465,
    servername: 'smtp.gmail.com',
  });
  socket.setTimeout(getEmailTimeoutMs());

  const readLine = createSmtpLineReader(socket);
  const readResponse = async () => {
    const lines: string[] = [];
    while (true) {
      const line = await readLine();
      lines.push(line);
      if (/^\d{3} /.test(line)) return lines.join('\n');
    }
  };

  const expect = async (codes: number[]) => {
    const response = await readResponse();
    const code = Number.parseInt(response.slice(0, 3), 10);
    if (!codes.includes(code)) throw new Error(`SMTP ${code || 'unknown'}: ${response}`);
    return response;
  };

  const command = async (line: string, codes: number[]) => {
    socket.write(`${line}\r\n`);
    return expect(codes);
  };

  try {
    await expect([220]);
    await command('EHLO helper.local', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(normalizedMessage.fromEmail, 'utf8').toString('base64'), [334]);
    await command(Buffer.from(process.env.GMAIL_APP_PASSWORD ?? '', 'utf8').toString('base64'), [
      235,
    ]);
    await command(`MAIL FROM:<${normalizedMessage.fromEmail}>`, [250]);
    for (const recipient of normalizedMessage.to) {
      await command(`RCPT TO:<${recipient}>`, [250, 251]);
    }
    await command('DATA', [354]);
    socket.write(`${buildMimeMessage(normalizedMessage)}\r\n.\r\n`);
    await expect([250]);
    await command('QUIT', [221]).catch(() => undefined);
  } finally {
    socket.end();
    socket.destroy();
  }
}

function getGmailUser() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  const [email] = parseEmails(user);
  return email ?? null;
}

async function sendViaGmail(
  email: BuiltEmail,
  to: string[],
  input: TicketNotificationInput,
): Promise<{ ok: boolean; reason?: string }> {
  const fromEmail = getGmailUser();
  if (!fromEmail) return { ok: false, reason: 'no_gmail_config' };

  try {
    await sendSmtpMessage({
      fromEmail,
      fromName: 'Helper',
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    logger.info('email_notification_sent', {
      provider: 'gmail',
      notificationType: input.type,
      ticketCode: input.ticket.code,
    });
    return { ok: true };
  } catch (error) {
    logger.warn('email_notification_failed', {
      provider: 'gmail',
      notificationType: input.type,
      ticketCode: input.ticket.code,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: 'request_failed' };
  }
}

type GenericEmailInput = {
  subject: string;
  html: string;
  text: string;
  to: string[];
  tag?: string;
};

export async function sendGenericEmail(input: GenericEmailInput) {
  if (input.to.length === 0) {
    return { ok: false, skipped: true, reason: 'no_recipients' } as const;
  }

  const fromEmail = getGmailUser();
  if (fromEmail) {
    try {
      await sendSmtpMessage({
        fromEmail,
        fromName: 'Helper',
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      logger.info('generic_email_sent', { provider: 'gmail', tag: input.tag });
      return { ok: true, provider: 'gmail' } as const;
    } catch (error) {
      logger.warn('generic_email_failed', {
        provider: 'gmail',
        tag: input.tag,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ok: false, reason: 'no_provider' } as const;
}

export function buildSimpleEmail(opts: {
  title: string;
  intro?: string;
  items: Array<{ heading: string; lines: string[]; url?: string | null }>;
  ctaLabel?: string;
  ctaUrl?: string;
}): { html: string; text: string } {
  const { title, intro, items, ctaLabel, ctaUrl } = opts;

  const htmlItems = items
    .map((item) => {
      const headingHtml = `<p style="margin:0 0 4px;color:${BRAND.emailText};font-size:14px;font-weight:700;">${escapeHtml(item.heading)}</p>`;
      const linesHtml = item.lines
        .map(
          (line) =>
            `<p style="margin:0;color:${BRAND.mutedText};font-size:13px;line-height:1.45;">${escapeHtml(line)}</p>`,
        )
        .join('');
      const linkHtml = item.url
        ? `<p style="margin:6px 0 0;"><a href="${escapeHtml(item.url)}" style="color:${BRAND.emailPrimary};font-size:12px;font-weight:600;text-decoration:none;">Abrir</a></p>`
        : '';
      return `<div style="padding:12px 0;border-bottom:1px solid ${BRAND.border};">${headingHtml}${linesHtml}${linkHtml}</div>`;
    })
    .join('');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:${BRAND.emailBg};padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:12px;padding:24px;">
        <p style="margin:0 0 8px;color:${BRAND.emailPrimary};font-size:13px;font-weight:700;">Helper</p>
        <h1 style="margin:0 0 12px;color:${BRAND.emailText};font-size:20px;line-height:1.3;">${escapeHtml(title)}</h1>
        ${intro ? `<p style="margin:0 0 14px;color:${BRAND.graphite};font-size:14px;line-height:1.5;">${escapeHtml(intro)}</p>` : ''}
        <div>${htmlItems}</div>
        ${
          ctaUrl && ctaLabel
            ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${BRAND.emailPrimary};color:${BRAND.white};text-decoration:none;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:700;">${escapeHtml(ctaLabel)}</a></p>`
            : ''
        }
      </div>
    </div>`;

  const textLines = [
    title,
    ...(intro ? ['', intro] : []),
    '',
    ...items.flatMap((item) => [
      item.heading,
      ...item.lines,
      ...(item.url ? [item.url] : []),
      '',
    ]),
    ...(ctaUrl && ctaLabel ? [`${ctaLabel}: ${ctaUrl}`] : []),
  ];

  return { html, text: textLines.join('\n') };
}

export async function sendTicketNotification(input: TicketNotificationInput) {
  const to = getRecipientsForArea(input.ticket.area);

  if (to.length === 0) {
    logger.info('email_notification_skipped', {
      reason: 'no_recipients',
      notificationType: input.type,
      ticketCode: input.ticket.code,
    });
    return { ok: false, skipped: true, reason: 'no_recipients' } as const;
  }

  const email = buildTicketNotificationEmail(input);

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const result = await sendViaGmail(email, to, input);
    if (result.ok) return { ok: true, provider: 'gmail' } as const;
  }

  logger.info('email_notification_skipped', {
    reason: 'no_provider_configured',
    notificationType: input.type,
    ticketCode: input.ticket.code,
  });
  return { ok: false, skipped: true, reason: 'no_provider_configured' } as const;
}
