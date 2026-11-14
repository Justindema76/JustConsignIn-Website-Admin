// Hamilton & Niagara is Justin's own branch of Sunwings. Two kinds of lead:
//  - "credit": it came through the /hamilton-niagara section of the site (or an ad pointing
//    there, or the visitor was in that section within the last 90 days). These are Justin's.
//  - "area": it came from the main site but the move starts or ends in a branch town. Flagged
//    so Justin can see them, but not counted as his.
// Worked out from what every quote already saves (lead_source and the cities), no extra data.

export const BRANCH_NAME = 'Hamilton & Niagara';

// Towns that count as the branch area. Oakville and Milton are left out: they're GTA jobs.
export const BRANCH_TOWNS = [
  'Hamilton', 'Stoney Creek', 'Ancaster', 'Dundas', 'Waterdown', 'Flamborough', 'Binbrook', 'Mount Hope',
  'Burlington', 'Grimsby', 'Lincoln', 'Beamsville', 'Vineland', 'West Lincoln', 'Smithville',
  'St. Catharines', 'St Catharines', 'Saint Catharines', 'Niagara Falls', 'Niagara-on-the-Lake', 'Niagara on the Lake',
  'Welland', 'Thorold', 'Fort Erie', 'Port Colborne', 'Pelham', 'Fonthill', 'Wainfleet', 'Niagara',
];

const TOWN_RE = new RegExp(`\\b(${BRANCH_TOWNS.map(town => town.replace(/[.]/g, '\\.?').replace(/ /g, '[\\s-]+')).join('|')})\\b`, 'i');
const SECTION_RE = /hamilton-niagara|hamilton & niagara|ad:[^·]*\b(hamilton|niagara|hn)\b/i;

export function branchOf(row) {
  if (!row || row.request_type === 'contact') return null;
  if (SECTION_RE.test(String(row.lead_source || ''))) return 'credit';
  const places = [row.pickup_city, row.dropoff_city, row.move_from, row.move_to].filter(Boolean).join(' | ');
  return TOWN_RE.test(places) ? 'area' : null;
}

export const isBranchCredit = row => branchOf(row) === 'credit';

// Booked = the customer said yes (accepted, booked or done).
export const BOOKED_STATUSES = new Set(['accepted', 'booked', 'complete']);
