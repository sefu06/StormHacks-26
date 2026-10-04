import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDate, time24, displayTime } from '../src/lib/dates.ts';

test('prescription dates reject nonexistent days and partial entries', () => {
  assert.equal(parseDate({ month: '2', day: '29', year: '2026' }), null);
  assert.equal(parseDate({ month: '4', day: '31', year: '2026' }), null);
  assert.equal(parseDate({ month: '10', day: '', year: '2026' }), null);
  assert.equal(parseDate({ month: '2', day: '29', year: '2028' }), '2028-02-29');
  assert.equal(parseDate({ month: '', day: '', year: '' }), '');
});
test('12-hour reminders preserve midnight, noon, and afternoon times', () => {
  assert.equal(time24('12:00', 'AM'), '00:00');
  assert.equal(time24('12:00', 'PM'), '12:00');
  assert.equal(time24('8:30', 'PM'), '20:30');
  assert.equal(displayTime('00:00'), '12:00 AM');
  assert.equal(displayTime('20:30'), '8:30 PM');
  assert.equal(time24('13:00', 'AM'), null);
  assert.equal(time24('8:60', 'AM'), null);
});
