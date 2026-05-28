import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateMaxChromebooksUsed,
  combineDateTimeInSaoPaulo,
  findRoomConflict,
  isActiveChromebookBookingStatus,
  validateChromebookHolidayPolicy,
} from '@/lib/chromebooks';

describe('Chromebook scheduling rules', () => {
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
});
