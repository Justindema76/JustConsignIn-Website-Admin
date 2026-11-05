// Sunwings ↔ Marius (dispatch): send jobs to his Make webhook (→ his Airtable) and read his
// Job Status / Job Date / Final Price back. Secrets live in Vercel env vars, never in code:
//   SUNWINGS_MAKE_WEBHOOK_URL  – Marius's Make webhook
//   SUNWINGS_AIRTABLE_TOKEN    – read-only Airtable token
//   SUNWINGS_AIRTABLE_BASE     – optional, defaults below
//   SUNWINGS_AIRTABLE_TABLE    – optional, defaults below

import { photoPaths, signPhotoPaths } from './sunwingsPhotos.js';

const AIRTABLE_BASE = () => process.env.SUNWINGS_AIRTABLE_BASE || 'apphgwJeoFeNAiW8a';
const AIRTABLE_TABLE = () => process.env.SUNWINGS_AIRTABLE_TABLE || 'tblfL8OcXrBvUSCiF';

const text = value => String(value ?? '').trim();
const yesNo = value => value == null ? 'Not given' : value ? 'Yes' : 'No';

function address(parts, fallback) {
  return parts.map(text).filter(Boolean).join(', ') || text(fallback);
}

function access(elevator, stairs) {
  if (elevator == null && stairs == null) return '';
  return `Elevator: ${yesNo(elevator)} · Stairs: ${yesNo(stairs)}`;
}

function isoDate(value) {
  const raw = text(value);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (match) return match[1];
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
}

// The fields Marius asked for, plus `photos` (customer photo links, valid 7 days —
// Airtable copies an attachment when the record is created).
export function makePayload(row, photoUrls = []) {
  return {
    customerName: text(row.name),
    phone: text(row.phone),
    email: text(row.email),
    service: text(row.service),
    requestedDate: isoDate(row.preferred_date),
    preferredTime: text(row.preferred_time),
    pickupAddress: address([row.pickup_address, row.pickup_city, row.pickup_postal_code], row.move_from),
    dropoffAddress: address([row.dropoff_address, row.dropoff_city, row.dropoff_postal_code], row.move_to),
    pickupAccess: access(row.pickup_elevator, row.pickup_stairs),
    dropoffAccess: access(row.dropoff_elevator, row.dropoff_stairs),
    items: [text(row.move_size) && `Size: ${text(row.move_size)}`, text(row.item_list)].filter(Boolean).join('\n'),
    additionalInformation: text(row.message),
    submissionId: text(row.id),
    photos: photoUrls,
  };
}

export function makeConfigured() {
  return Boolean(process.env.SUNWINGS_MAKE_WEBHOOK_URL);
}

export async function sendJobToMake(row) {
  const url = process.env.SUNWINGS_MAKE_WEBHOOK_URL;
  if (!url) throw new Error('Marius’s Make webhook is not set up yet (SUNWINGS_MAKE_WEBHOOK_URL).');
  const paths = photoPaths(row);
  const signed = await signPhotoPaths(paths, 7 * 24 * 3600);
  const photoUrls = paths.map(path => signed[path]).filter(Boolean);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makePayload(row, photoUrls)),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Marius’s system did not accept the job (${response.status}${body ? `: ${body.slice(0, 120)}` : ''}).`);
  }
}

// ---- Reading Marius's updates back from Airtable ----

export function airtableConfigured() {
  return Boolean(process.env.SUNWINGS_AIRTABLE_TOKEN);
}

function money(value) {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(amount) ? amount : null;
}

// His free-text Job Status → our job step (unknown wording just shows as his note).
export function stepFromJobStatus(value) {
  const status = text(value).toLowerCase();
  if (!status) return '';
  if (/(complete|completed|done|finished|paid)/.test(status)) return 'complete';
  if (/(book|confirm|scheduled)/.test(status)) return 'booked';
  if (/(cancel|declin|lost|can.?t|no job|not interested)/.test(status)) return 'declined';
  if (/(quote|price|estimate)/.test(status)) return 'priced';
  return '';
}

// Returns { [quoteId]: { jobStatus, jobDate, finalPrice } } for the given quote ids.
export async function readMariusUpdates(ids) {
  const token = process.env.SUNWINGS_AIRTABLE_TOKEN;
  if (!token || !ids.length) return {};
  const updates = {};
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40).map(id => text(id).replace(/'/g, ''));
    const formula = `OR(${chunk.map(id => `{Submission ID}='${id}',{Website Lead ID}='${id}'`).join(',')})`;
    let offset = '';
    do {
      const params = new URLSearchParams({ filterByFormula: formula, pageSize: '100' });
      ['Submission ID', 'Website Lead ID', 'Job Status', 'Job Date', 'Final Price'].forEach(field => params.append('fields[]', field));
      if (offset) params.set('offset', offset);
      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE()}/${AIRTABLE_TABLE()}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || `Airtable read failed (${response.status}).`);
      for (const record of data.records || []) {
        const f = record.fields || {};
        const id = text(f['Website Lead ID']) || text(f['Submission ID']);
        if (!id) continue;
        updates[id] = {
          jobStatus: text(f['Job Status']),
          jobDate: isoDate(f['Job Date']),
          finalPrice: money(f['Final Price']),
        };
      }
      offset = data.offset || '';
    } while (offset);
  }
  return updates;
}
