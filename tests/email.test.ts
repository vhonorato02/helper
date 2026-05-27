import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { buildTicketNotificationEmail } from '@/lib/email';

describe('ticket notification emails', () => {
  afterEach(() => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('builds a safe ticket-created message with a production link', () => {
    process.env.APP_URL = 'https://helperpinda.vercel.app';

    const email = buildTicketNotificationEmail({
      type: 'ticket_created',
      actorName: 'Usuario TESTE',
      ticket: {
        code: 'TI-0001',
        area: 'TI',
        title: 'Ticket TESTE <script>',
        subcategory: 'Rede',
        priority: 'alta',
        status: 'aberto',
        origin: 'Teste automatizado',
      },
    });

    assert.match(email.subject, /TI-0001/);
    assert.match(email.text, /https:\/\/helperpinda\.vercel\.app\/tickets\/TI-0001/);
    assert.match(email.html, /Ticket TESTE &lt;script&gt;/);
    assert.doesNotMatch(email.html, /Ticket TESTE <script>/);
  });
});
