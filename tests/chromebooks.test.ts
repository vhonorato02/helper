import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { chromebookBookingLocks, chromebookBookings } from '@/db/schema';
import { canManageChromebookBookings } from '@/lib/chromebook-permissions';
import {
  calculateMaxChromebooksUsed,
  combineDateTimeInSaoPaulo,
  findRoomConflict,
  isActiveChromebookBookingStatus,
  validateChromebookHolidayPolicy,
} from '@/lib/chromebooks';

function getIndexColumnName(column: unknown) {
  if (typeof column === 'object' && column !== null && 'name' in column && typeof column.name === 'string') {
    return column.name;
  }
  return null;
}

describe('Chromebook scheduling rules', () => {
  it('allows only admins to manage Chromebook bookings', () => {
    assert.equal(canManageChromebookBookings({ isAdmin: true }), true);
    assert.equal(canManageChromebookBookings({ isAdmin: false }), false);
    assert.equal(canManageChromebookBookings({ isAdmin: null }), false);
    assert.equal(canManageChromebookBookings(null), false);
  });

  it('calculates concurrent usage for partially overlapping intervals', () => {
    const requestedStart = combineDateTimeInSaoPaulo('2026-08-10', '08:00');
    const requestedEnd = combineDateTimeInSaoPaulo('2026-08-10', '10:00');
    const bookings = [
      {
        startAt: combineDateTimeInSaoPaulo('2026-08-10', '08:00'),
        endAt: combineDateTimeInSaoPaulo('2026-08-10', '09:00'),
        quantity: 15,
      },
      {
        startAt: combineDateTimeInSaoPaulo('2026-08-10', '08:30'),
        endAt: combineDateTimeInSaoPaulo('2026-08-10', '09:30'),
        quantity: 10,
      },
    ];

    assert.equal(calculateMaxChromebooksUsed(requestedStart, requestedEnd, bookings), 25);
  });

  it('detects same-room overlap independently from quantity', () => {
    const conflict = findRoomConflict(
      'Sala 1',
      combineDateTimeInSaoPaulo('2026-08-10', '08:30'),
      combineDateTimeInSaoPaulo('2026-08-10', '09:30'),
      [
        {
          room: 'sala 1',
          startAt: combineDateTimeInSaoPaulo('2026-08-10', '08:00'),
          endAt: combineDateTimeInSaoPaulo('2026-08-10', '09:00'),
          quantity: 5,
        },
      ],
    );

    assert.equal(conflict?.room, 'sala 1');
  });

  it('blocks full holidays and morning partial optional dates', () => {
    assert.equal(validateChromebookHolidayPolicy('2026-04-03', '09:00').ok, false);
    assert.equal(validateChromebookHolidayPolicy('2026-02-18', '09:00').ok, false);
    assert.equal(validateChromebookHolidayPolicy('2026-02-18', '13:00').ok, true);
  });

  it('reserves devices only for pending and confirmed statuses', () => {
    assert.equal(isActiveChromebookBookingStatus('pendente'), true);
    assert.equal(isActiveChromebookBookingStatus('confirmado'), true);
    assert.equal(isActiveChromebookBookingStatus('cancelado'), false);
  });

  it('keeps the booking lock table declared in the Drizzle schema', () => {
    assert.equal(getTableName(chromebookBookingLocks), 'chromebook_booking_locks');
    assert.equal(chromebookBookingLocks.id.name, 'id');
    assert.equal(chromebookBookingLocks.owner.name, 'owner');
    assert.equal(chromebookBookingLocks.expiresAt.name, 'expires_at');
  });

  it('keeps Chromebook booking protocols unique when present', () => {
    const protocolIndex = getTableConfig(chromebookBookings).indexes.find(
      (index) => index.config.name === 'chromebook_bookings_protocol_idx',
    );

    assert.equal(protocolIndex?.config.unique, true);
    assert.equal(getIndexColumnName(protocolIndex?.config.columns[0]), chromebookBookings.protocol.name);
    assert.ok(protocolIndex?.config.where);
  });
});
