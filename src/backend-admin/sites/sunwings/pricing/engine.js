// Sunwings price engine (implementation brief: "Instant quote system", sections 02–04 and 06).
// Pure functions, no network: the admin calculator, the quote approval screen and (later) the
// website's estimate all use this, so the same inputs always give the same price.
//
// Money is in Canadian dollars before tax unless a name says otherwise. A rate that has not been
// set is null, never 0: a job that needs it is marked "needs review" instead of being underpriced.

export const PRICING_VERSION = 'sunwings-pricing-1';

// Starting settings. Numbers from the brief are filled in; everything Marius still has to confirm
// is null and must be entered in Admin › Price calculator before estimates can be shown.
export const DEFAULT_PRICING_SETTINGS = {
  version: PRICING_VERSION,
  taxRate: 0.13, // Ontario HST
  commission: { rate: 0.2, eligibleServices: [] }, // 20% of the full pre-tax quote on eligible jobs
  contributionPerHour: { low: 50, high: 75 }, // owner-driven target per dispatch hour, after direct costs
  serviceMinimums: { default: 150 }, // retained minimum (before commission). C$150 pending confirmation.
  dispatchBase: { label: '', address: '' },
  van: { name: 'Ford Transit 150', costPerKm: null, fuelIncluded: true, fuelPerKm: null },
  crew: { driverHourly: null, helperHourly: null, minimumPaidHours: null },
  rentals: [
    // Waterloo receipt from the brief: C$29.95 base + C$2.07/mile + C$16 waiver + C$1 fee.
    { id: 'waterloo-truck', label: 'Rental truck (Waterloo receipt)', base: 29.95, perMile: 2.07, includedMiles: 0, waiver: 16, fees: 1 },
  ],
  estimatesEnabled: {}, // per service slug: true only once Marius has approved its rates
};

const num = value => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? null : Number(value));
export const roundUpCents = value => Math.ceil(Math.round(value * 1e6) / 1e4) / 100;
export const roundCents = value => Math.round((value + Number.EPSILON) * 100) / 100;
const sum = list => roundCents(list.reduce((total, item) => total + item, 0));

// Rental truck: base + billable miles (after any included allowance) × rate + waiver + fees (+ fuel bought separately).
export function rentalCost(rental, miles, fuel = 0) {
  const base = num(rental?.base);
  const perMile = num(rental?.perMile);
  if (base === null || perMile === null) return { cost: null, missing: ['rental base charge or per-mile rate'] };
  const billable = Math.max(0, (num(miles) || 0) - (num(rental.includedMiles) || 0));
  return { cost: sum([base, billable * perMile, num(rental.waiver) || 0, num(rental.fees) || 0, num(fuel) || 0]), missing: [] };
}

// Owned van: approved cost per km, plus fuel only when the cost per km leaves fuel out.
export function vanCost(van, km) {
  const perKm = num(van?.costPerKm);
  if (perKm === null) return { cost: null, missing: ['van cost per km'] };
  let cost = (num(km) || 0) * perKm;
  if (van.fuelIncluded === false) {
    const fuel = num(van.fuelPerKm);
    if (fuel === null) return { cost: null, missing: ['van fuel per km'] };
    cost += (num(km) || 0) * fuel;
  }
  return { cost: roundCents(cost), missing: [] };
}

// Paid crew: each worker's flat pay, or hourly cost × paid hours (never below the minimum shift).
export function crewCost(crew = [], settings = DEFAULT_PRICING_SETTINGS) {
  const missing = [];
  const minimum = num(settings.crew?.minimumPaidHours) || 0;
  const costs = crew.map(worker => {
    if (num(worker.flat) !== null) return num(worker.flat);
    const hourly = num(worker.hourly) ?? num(worker.role === 'helper' ? settings.crew?.helperHourly : settings.crew?.driverHourly);
    if (hourly === null) { missing.push(`${worker.role || 'crew'} hourly cost`); return 0; }
    return hourly * Math.max(num(worker.hours) || 0, minimum);
  });
  return { cost: missing.length ? null : sum(costs), missing };
}

// The core formula (brief section 04), for one scenario:
//   required contribution = dispatch hours × contribution target per hour
//   required Sunwings amount = max(service minimum, direct costs + required contribution)
//   customer price before tax = required amount ÷ (1 − commission rate), rounded up to cents
export function priceScenario({ dispatchHours, directCost, contributionPerHour, minimum = 0, commissionRate = 0, taxRate = 0.13 }) {
  const missing = [];
  if (num(dispatchHours) === null) missing.push('dispatch hours');
  if (num(directCost) === null) missing.push('direct costs');
  if (num(contributionPerHour) === null) missing.push('contribution target per hour');
  if (missing.length) return { needsReview: true, missing, price: null };
  const requiredContribution = roundCents(dispatchHours * contributionPerHour);
  const requiredAmount = roundCents(Math.max(num(minimum) || 0, directCost + requiredContribution));
  const price = commissionRate ? roundUpCents(requiredAmount / (1 - commissionRate)) : roundUpCents(requiredAmount);
  const commission = roundCents(price * commissionRate);
  const retained = roundCents(price - commission);
  const contribution = roundCents(retained - directCost);
  const tax = roundCents(price * taxRate);
  return {
    needsReview: false, missing: [],
    dispatchHours, directCost: roundCents(directCost), requiredContribution, requiredAmount,
    price, commission, retained, contribution, tax, totalWithTax: roundCents(price + tax),
    // Recheck after rounding (brief: "recheck the retained minimum and contribution after commission").
    meetsMinimum: retained + 0.005 >= (num(minimum) || 0),
    meetsContribution: contribution + 0.005 >= requiredContribution,
  };
}

// Checking a price someone set by hand (e.g. Marius's quote): what is left after commission,
// the most the job may cost directly, and whether it is underpriced.
export function checkPrice({ price, dispatchHours, contributionPerHour, commissionRate = 0, directCost = null }) {
  const retained = roundCents(price * (1 - commissionRate));
  const requiredContribution = roundCents(dispatchHours * contributionPerHour);
  const maxDirectCost = roundCents(retained - requiredContribution);
  return {
    retained, requiredContribution, maxDirectCost,
    contribution: directCost === null ? null : roundCents(retained - directCost),
    underpriced: directCost === null ? null : directCost > maxDirectCost + 0.005,
  };
}

// A whole job, low and high (brief: "use approved low and high cost and time assumptions").
// job: { service, hours: {low, high}, km: {low, high}, vehicle: 'van'|'rental', rentalId, rentalMiles: {low,high},
//        rentalFuel, crew: [{ role, hours?, hourly?, flat? }], extras: { tolls, parking, supplies, equipment },
//        helpAtBothEnds, helperCrewReduction }
export function estimateJob(job, settings = DEFAULT_PRICING_SETTINGS) {
  const commissionRate = (settings.commission?.eligibleServices || []).includes(job.service) ? num(settings.commission?.rate) || 0 : 0;
  const minimum = num(settings.serviceMinimums?.[job.service]) ?? num(settings.serviceMinimums?.default) ?? 0;
  const extras = sum(Object.values(job.extras || {}).map(value => num(value) || 0));

  const scenario = (end, crew) => {
    const hours = num(job.hours?.[end]);
    const missing = [];
    let vehicle;
    if (job.vehicle === 'rental') {
      const rental = (settings.rentals || []).find(item => item.id === job.rentalId);
      vehicle = rental ? rentalCost(rental, job.rentalMiles?.[end], job.rentalFuel) : { cost: null, missing: ['rental truck rates'] };
      if (vehicle.cost !== null && num(job.km?.[end]) !== null && settings.van) {
        // Crew still drives the van to and from the rental branch where that adds distance.
        const toBranch = num(job.branchKm);
        if (toBranch) {
          const extra = vanCost(settings.van, toBranch);
          if (extra.cost === null) missing.push(...extra.missing); else vehicle = { cost: roundCents(vehicle.cost + extra.cost), missing: [] };
        }
      }
    } else {
      vehicle = vanCost(settings.van, job.km?.[end]);
    }
    missing.push(...vehicle.missing);
    const crewPaid = crewCost((crew || []).map(worker => ({ ...worker, hours: num(worker.hours) ?? hours })), settings);
    missing.push(...crewPaid.missing);
    if (hours === null) missing.push('dispatch hours');
    if (missing.length) return { needsReview: true, missing: [...new Set(missing)], price: null };
    const directCost = roundCents(vehicle.cost + crewPaid.cost + extras);
    return {
      ...priceScenario({ dispatchHours: hours, directCost, contributionPerHour: num(settings.contributionPerHour?.[end]), minimum, commissionRate, taxRate: num(settings.taxRate) ?? 0.13 }),
      breakdown: { vehicle: vehicle.cost, crew: crewPaid.cost, extras },
    };
  };

  const crew = job.crew || [];
  const low = scenario('low', crew);
  const high = scenario('high', crew);
  // Help & Save: only when capable help is confirmed at BOTH ends and the crew can be reduced.
  let helpAndSave = null;
  const reduceBy = num(job.helperCrewReduction) || 0;
  if (job.helpAtBothEnds === true && reduceBy > 0 && crew.length > reduceBy) {
    const smaller = crew.slice(0, crew.length - reduceBy);
    const saveLow = scenario('low', smaller);
    const saveHigh = scenario('high', smaller);
    helpAndSave = {
      low: saveLow, high: saveHigh,
      savings: saveLow.price !== null && low.price !== null && saveHigh.price !== null && high.price !== null
        ? { low: roundCents(low.price - saveLow.price), high: roundCents(high.price - saveHigh.price) } : null,
    };
  }
  return {
    version: settings.version || PRICING_VERSION,
    service: job.service, commissionRate, minimum,
    low, high, helpAndSave,
    needsReview: Boolean(low.needsReview || high.needsReview),
    missing: [...new Set([...(low.missing || []), ...(high.missing || [])])],
  };
}
