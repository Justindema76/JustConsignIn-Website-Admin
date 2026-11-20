// The brief's acceptance tests (section 06). Run: node --test src/backend-admin/sites/sunwings/pricing/
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PRICING_SETTINGS, checkPrice, estimateJob, priceScenario, priceWithCommission, rentalCost } from './engine.js';

test('Local van with commission: 2.5 h, C$116.50 direct, C$60/h → C$333.13 before tax', () => {
  const r = priceScenario({ dispatchHours: 2.5, directCost: 116.5, contributionPerHour: 60, commissionRate: 0.2 });
  assert.equal(r.requiredAmount, 266.5);
  assert.equal(r.price, 333.13);
  assert.equal(r.commission, 66.63);
  assert.equal(r.contribution, 150);
  assert.equal(r.meetsContribution, true);
});

test('Small local van job minimum: C$150 retained → C$187.50 with 20% commission', () => {
  const r = priceScenario({ dispatchHours: 1, directCost: 20, contributionPerHour: 60, minimum: 150, commissionRate: 0.2 });
  assert.equal(r.requiredAmount, 150);
  assert.equal(r.price, 187.5);
  assert.equal(r.retained, 150);
  assert.equal(r.meetsMinimum, true);
});

test('Actual Waterloo rental receipt: C$29.95 + 30 mi × C$2.07 + C$16 + C$1 = C$109.05', () => {
  const r = rentalCost(DEFAULT_PRICING_SETTINGS.rentals[0], 30);
  assert.equal(r.cost, 109.05);
  // Receipt total with tax was C$123.22; 13% HST on C$109.05 is within a cent (the rental company rounds down).
  assert.ok(Math.abs(109.05 * 1.13 - 123.22) < 0.01);
});

test('Cancelled Grimsby→Toronto quote: C$475, 5 h, C$60/h → C$380 left, max direct C$80, flags above', () => {
  const ok = checkPrice({ price: 475, dispatchHours: 5, contributionPerHour: 60, commissionRate: 0.2, directCost: 80 });
  assert.equal(ok.retained, 380);
  assert.equal(ok.maxDirectCost, 80);
  assert.equal(ok.underpriced, false);
  assert.equal(checkPrice({ price: 475, dispatchHours: 5, contributionPerHour: 60, commissionRate: 0.2, directCost: 95 }).underpriced, true);
});

test('Missing rates never become zero: the job goes to review with what is missing', () => {
  const r = estimateJob({ service: 'furniture-delivery', hours: { low: 2, high: 3 }, km: { low: 40, high: 60 }, vehicle: 'van', crew: [{ role: 'driver' }] });
  assert.equal(r.needsReview, true);
  assert.equal(r.low.price, null);
  assert.ok(r.missing.includes('van cost per km'));
  assert.ok(r.missing.includes('driver hourly cost'));
  const noRental = estimateJob({ service: 'residential-moving', hours: { low: 4, high: 5 }, vehicle: 'rental', rentalId: 'nope', crew: [] });
  assert.equal(noRental.needsReview, true);
  assert.ok(noRental.missing.includes('rental truck rates'));
});

const ready = {
  ...DEFAULT_PRICING_SETTINGS,
  van: { name: 'Transit 150', costPerKm: 0.5, fuelIncluded: true },
  crew: { driverHourly: 25, helperHourly: 22, minimumPaidHours: 3 },
  commission: { mode: 'flat', rate: 0.2, excludedServices: [] },
};

test('Low and high range for a full van job, with minimum shift and commission', () => {
  const r = estimateJob({ service: 'furniture-delivery', hours: { low: 2, high: 3 }, km: { low: 40, high: 60 }, vehicle: 'van', crew: [{ role: 'driver' }], extras: { parking: 10 } }, ready);
  assert.equal(r.needsReview, false);
  // low: van 20 + driver 25×3 (3 h minimum shift) + parking 10 = 105; + 2 h × 50 = 205; ÷ 0.8 = 256.25
  assert.equal(r.low.directCost, 105);
  assert.equal(r.low.price, 256.25);
  // high: van 30 + driver 75 + 10 = 115; + 3 h × 75 = 340; ÷ 0.8 = 425
  assert.equal(r.high.price, 425);
});

test('Help & Save only when help is confirmed at both ends', () => {
  const job = { service: 'furniture-delivery', hours: { low: 3, high: 4 }, km: { low: 30, high: 30 }, vehicle: 'van', crew: [{ role: 'driver' }, { role: 'helper' }], helperCrewReduction: 1 };
  assert.equal(estimateJob({ ...job, helpAtBothEnds: false }, ready).helpAndSave, null);
  const r = estimateJob({ ...job, helpAtBothEnds: true }, ready);
  assert.ok(r.helpAndSave);
  // the helper's paid hours drop out: 22 × 3 = 66 (low) and 22 × 4 = 88 (high), ÷ 0.8
  assert.equal(r.helpAndSave.savings.low, 82.5);
  assert.equal(r.helpAndSave.savings.high, 110);
});

test('Tiered commission (admin rule): 10% up to C$800, 20% over', () => {
  const tiered = { mode: 'tiered', threshold: 800, lowRate: 0.1, highRate: 0.2 };
  const small = priceWithCommission({ dispatchHours: 2.5, directCost: 116.5, contributionPerHour: 60 }, tiered);
  assert.equal(small.commissionRate, 0.1);
  assert.equal(small.price, 296.12); // 266.50 ÷ 0.9, rounded up
  const big = priceWithCommission({ dispatchHours: 8, directCost: 500, contributionPerHour: 60 }, tiered);
  assert.equal(big.commissionRate, 0.2);
  assert.equal(big.price, 1225); // 980 ÷ 0.8
});

test('Default commission is the tiered rule, and an excluded service pays none', () => {
  assert.equal(DEFAULT_PRICING_SETTINGS.commission.mode, 'tiered');
  const settings = { ...ready, commission: { ...DEFAULT_PRICING_SETTINGS.commission, excludedServices: ['junk-removal'] } };
  const job = { hours: { low: 2.5, high: 2.5 }, km: { low: 0, high: 0 }, vehicle: 'van', crew: [], extras: { supplies: 116.5 } };
  const paying = estimateJob({ ...job, service: 'furniture-delivery' }, settings);
  assert.equal(paying.low.commissionRate, 0.1); // C$296.12 is under C$800
  const excluded = estimateJob({ ...job, service: 'junk-removal' }, settings);
  assert.equal(excluded.low.commissionRate, 0);
  assert.equal(excluded.commissionEligible, false);
});
