import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadPricingSettings, savePricingSettings } from './sunwingsAdminService';
import { loadServicePosts } from './sunwingsPostStore';
import { DEFAULT_PRICING_SETTINGS, checkPrice, estimateJob, rentalCost } from './pricing/engine';
import { money } from './commission';
import './pricingAdmin.css';

// Admin › Price calculator (instant-quote brief): Marius's rates, and a calculator that gives a
// low–high price for a job with the full breakdown. Nothing here is shown to customers until a
// service's estimates are switched on (and the website side is built).

const blankJob = {
  service: '',
  hours: { low: '', high: '' },
  km: { low: '', high: '' },
  vehicle: 'van',
  rentalId: '',
  rentalMiles: { low: '', high: '' },
  rentalFuel: '',
  branchKm: '',
  crew: [{ role: 'driver' }],
  extras: { tolls: '', parking: '', supplies: '', equipment: '' },
  helpAtBothEnds: false,
  helperCrewReduction: 1,
};

function merge(saved) {
  const base = structuredClone(DEFAULT_PRICING_SETTINGS);
  if (!saved || typeof saved !== 'object') return base;
  return {
    ...base, ...saved,
    commission: { ...base.commission, ...(saved.commission || {}) },
    contributionPerHour: { ...base.contributionPerHour, ...(saved.contributionPerHour || {}) },
    serviceMinimums: { ...base.serviceMinimums, ...(saved.serviceMinimums || {}) },
    dispatchBase: { ...base.dispatchBase, ...(saved.dispatchBase || {}) },
    van: { ...base.van, ...(saved.van || {}) },
    crew: { ...base.crew, ...(saved.crew || {}) },
    rentals: Array.isArray(saved.rentals) ? saved.rentals : base.rentals,
    estimatesEnabled: { ...(saved.estimatesEnabled || {}) },
  };
}

const toNumber = value => (value === '' || value === null || value === undefined ? null : Number(value));
const pct = value => (value === null || value === undefined ? '' : Math.round(Number(value) * 1000) / 10);

function NumberField({ label, value, onChange, suffix = '', step = 'any', hint = '' }) {
  return <label className="pricing-field">
    <span>{label}</span>
    <div className="pricing-input"><input type="number" step={step} value={value ?? ''} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))} placeholder="Not set"/>{suffix ? <em>{suffix}</em> : null}</div>
    {hint ? <small>{hint}</small> : null}
  </label>;
}

function Range({ label, value, onChange, suffix }) {
  return <div className="pricing-range">
    <span>{label}</span>
    <div>
      <input type="number" step="any" value={value.low} onChange={event => onChange({ ...value, low: event.target.value })} placeholder="Low"/>
      <b>to</b>
      <input type="number" step="any" value={value.high} onChange={event => onChange({ ...value, high: event.target.value })} placeholder="High"/>
      {suffix ? <em>{suffix}</em> : null}
    </div>
  </div>;
}

function Scenario({ title, result }) {
  if (!result) return null;
  if (result.needsReview || result.price === null) {
    return <div className="pricing-result review"><h4>{title}</h4><p><AlertTriangle size={16}/> No price yet. Missing: {(result.missing || []).join(', ') || 'information'}. Fill these in under 1 · Rates.</p></div>;
  }
  return <div className="pricing-result">
    <h4>{title}</h4>
    <div className="pricing-price">{money(result.price)}<small> before tax</small></div>
    <dl>
      <div><dt>Vehicle</dt><dd>{money(result.breakdown?.vehicle)}</dd></div>
      <div><dt>Crew</dt><dd>{money(result.breakdown?.crew)}</dd></div>
      <div><dt>Tolls, parking, supplies</dt><dd>{money(result.breakdown?.extras)}</dd></div>
      <div className="strong"><dt>Cost to do the job</dt><dd>{money(result.directCost)}</dd></div>
      <div><dt>Marius’s target ({result.dispatchHours} h)</dt><dd>{money(result.requiredContribution)}</dd></div>
      <div><dt>Your commission ({Math.round(result.commissionRate * 100)}%)</dt><dd>{money(result.commission)}</dd></div>
      <div className="strong"><dt>Sunwings keeps</dt><dd>{money(result.retained)}</dd></div>
      <div><dt>Marius makes after costs</dt><dd>{money(result.contribution)}</dd></div>
      <div><dt>HST</dt><dd>{money(result.tax)}</dd></div>
      <div className="strong"><dt>Customer pays</dt><dd>{money(result.totalWithTax)}</dd></div>
    </dl>
    {!result.meetsMinimum || !result.meetsContribution ? <p className="pricing-warn"><AlertTriangle size={14}/> Below the minimum or Marius’s target after rounding.</p> : null}
  </div>;
}

export default function PricingAdmin() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState('rates');
  const [settings, setSettings] = useState(() => merge(null));
  const [services, setServices] = useState([]);
  const [job, setJob] = useState(blankJob);
  const [check, setCheck] = useState({ price: '', hours: '', direct: '', target: '' });
  const [status, setStatus] = useState({ loading: true, saving: false, error: '', message: '', updatedAt: null });

  useEffect(() => {
    if (!accessToken) return;
    Promise.allSettled([loadPricingSettings(accessToken), loadServicePosts(accessToken)]).then(([priced, posts]) => {
      if (priced.status === 'fulfilled') setSettings(merge(priced.value.settings));
      if (posts.status === 'fulfilled') setServices((posts.value || []).filter(item => item.title));
      setStatus(current => ({
        ...current, loading: false,
        updatedAt: priced.status === 'fulfilled' ? priced.value.updatedAt : null,
        error: priced.status === 'rejected' ? `${priced.reason?.message || 'Price settings did not load.'}` : '',
      }));
    });
  }, [accessToken]);

  const update = (path, value) => setSettings(current => {
    const next = structuredClone(current);
    let node = next;
    path.slice(0, -1).forEach(key => { node[key] = node[key] ?? {}; node = node[key]; });
    node[path[path.length - 1]] = value;
    return next;
  });

  async function save() {
    setStatus(current => ({ ...current, saving: true, error: '', message: '' }));
    try {
      const result = await savePricingSettings(accessToken, settings);
      setStatus(current => ({ ...current, saving: false, message: 'Rates saved.', updatedAt: result.updated_at }));
    } catch (error) {
      setStatus(current => ({ ...current, saving: false, error: error.message }));
    }
  }

  const serviceOptions = services.map(item => ({ slug: item.slug, title: item.title }));
  const estimate = useMemo(() => {
    if (!job.service) return null;
    const asJob = {
      ...job,
      hours: { low: toNumber(job.hours.low), high: toNumber(job.hours.high) },
      km: { low: toNumber(job.km.low), high: toNumber(job.km.high) },
      rentalMiles: { low: toNumber(job.rentalMiles.low), high: toNumber(job.rentalMiles.high) },
      rentalFuel: toNumber(job.rentalFuel), branchKm: toNumber(job.branchKm),
      extras: Object.fromEntries(Object.entries(job.extras).map(([key, value]) => [key, toNumber(value)])),
    };
    return estimateJob(asJob, settings);
  }, [job, settings]);

  const checked = useMemo(() => {
    const price = toNumber(check.price);
    const hours = toNumber(check.hours);
    if (price === null || hours === null) return null;
    const rate = settings.commission.mode === 'tiered'
      ? (price > Number(settings.commission.threshold) ? settings.commission.highRate : settings.commission.lowRate)
      : settings.commission.rate;
    const target = toNumber(check.target) ?? Number(settings.contributionPerHour.low);
    return { rate, ...checkPrice({ price, dispatchHours: hours, contributionPerHour: target, commissionRate: Number(rate) || 0, directCost: toNumber(check.direct) }) };
  }, [check, settings]);

  const missingRates = [
    settings.van.costPerKm === null && 'van cost per km',
    settings.crew.driverHourly === null && 'driver pay',
    settings.crew.minimumPaidHours === null && 'least hours paid per worker',
    !settings.dispatchBase.address && 'where the van starts the day',
  ].filter(Boolean);

  return <div className="site-admin-page pricing-admin">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Quotes &amp; jobs</p>
        <h1><Calculator size={26}/> Price calculator</h1>
        <p className="site-admin-muted">Works out what to charge for a job so it covers the costs, Marius’s profit and your commission. Only you see this; customers never do.</p>
      </div>
      {tab === 'rates' ? <button className="site-admin-btn" type="button" onClick={save} disabled={status.saving || status.loading}><Save size={15}/> {status.saving ? 'Saving…' : 'Save rates'}</button> : null}
    </div>

    {status.error ? <div className="site-admin-alert error">{status.error}</div> : null}
    {status.message ? <div className="site-admin-alert success"><CheckCircle2 size={16}/>{status.message}</div> : null}
    {missingRates.length ? <div className="site-admin-alert pricing-missing"><AlertTriangle size={16}/> Waiting on Marius’s numbers ({missingRates.join(', ')}). Until they’re in under 1 · Rates, jobs show “No price yet”.</div> : null}

    <div className="pricing-tabs" role="tablist">
      {[['rates', '1', 'Rates', 'Marius’s costs · once'], ['job', '2', 'Price a job', 'Every quote'], ['check', '3', 'Check a price', 'Is a quote too low?']].map(([key, n, label, sub]) => (
        <button type="button" role="tab" aria-selected={tab === key} key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
          <span className="pricing-tab-n">{n}</span><span><b>{label}</b><small>{sub}</small></span>
        </button>
      ))}
    </div>
    <p className="pricing-howto">{tab === 'rates'
      ? 'Type in Marius’s costs once and press Save rates. Change them only when his costs change. The guide “Sunwings Price Calculator Guide.pdf” in the Sunwings folder has the questions to ask him.'
      : tab === 'job'
        ? 'For each quote: pick the service, guess how long the trip takes and how far the van drives (a low and a high guess), and who goes. The price range to quote appears on the right.'
        : 'Got a price from Marius already? Type it in with the hours to see if it covers costs and his target, or if it’s too low.'}</p>

    {tab === 'job' ? <div className="pricing-grid">
      <section className="site-admin-card pricing-card pricing-form">
        <h3>The job</h3>
        <label className="pricing-field"><span>Service</span>
          <select value={job.service} onChange={event => setJob({ ...job, service: event.target.value })}>
            <option value="">Pick a service</option>
            {serviceOptions.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}
          </select>
        </label>
        <Range label="How long is the whole trip? (leaving base until back at base)" value={job.hours} onChange={hours => setJob({ ...job, hours })} suffix="h"/>
        <div className="pricing-toggle">
          <label><input type="radio" checked={job.vehicle === 'van'} onChange={() => setJob({ ...job, vehicle: 'van' })}/> {settings.van.name || 'Van'}</label>
          <label><input type="radio" checked={job.vehicle === 'rental'} onChange={() => setJob({ ...job, vehicle: 'rental' })}/> Rental truck</label>
        </div>
        {job.vehicle === 'van'
          ? <Range label="How far does the van drive in total?" value={job.km} onChange={km => setJob({ ...job, km })} suffix="km"/>
          : <>
            <label className="pricing-field"><span>Rental</span>
              <select value={job.rentalId} onChange={event => setJob({ ...job, rentalId: event.target.value })}>
                <option value="">Pick a rental</option>
                {settings.rentals.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <Range label="Rental truck miles" value={job.rentalMiles} onChange={rentalMiles => setJob({ ...job, rentalMiles })} suffix="mi"/>
            <div className="pricing-two">
              <NumberField label="Fuel bought for the truck" value={job.rentalFuel} onChange={value => setJob({ ...job, rentalFuel: value ?? '' })} suffix="$"/>
              <NumberField label="Extra van km to the rental branch" value={job.branchKm} onChange={value => setJob({ ...job, branchKm: value ?? '' })} suffix="km"/>
            </div>
          </>}
        <div className="pricing-crew">
          <span>Who goes (paid crew)</span>
          {job.crew.map((worker, index) => <div className="pricing-crew-row" key={index}>
            <select value={worker.role} onChange={event => setJob({ ...job, crew: job.crew.map((item, i) => (i === index ? { ...item, role: event.target.value } : item)) })}>
              <option value="driver">Driver</option>
              <option value="helper">Helper</option>
            </select>
            <input type="number" step="any" placeholder="Paid a flat amount? (optional)" value={worker.flat ?? ''} onChange={event => setJob({ ...job, crew: job.crew.map((item, i) => (i === index ? { ...item, flat: event.target.value === '' ? undefined : Number(event.target.value) } : item)) })}/>
            <button type="button" className="site-admin-icon-btn" aria-label="Remove" onClick={() => setJob({ ...job, crew: job.crew.filter((_, i) => i !== index) })}><Trash2 size={15}/></button>
          </div>)}
          <button type="button" className="site-admin-btn secondary" onClick={() => setJob({ ...job, crew: [...job.crew, { role: 'helper' }] })}><Plus size={15}/> Add crew</button>
        </div>
        <div className="pricing-two">
          {['tolls', 'parking', 'supplies', 'equipment'].map(key => <NumberField key={key} label={key[0].toUpperCase() + key.slice(1)} value={job.extras[key]} onChange={value => setJob({ ...job, extras: { ...job.extras, [key]: value ?? '' } })} suffix="$"/>)}
        </div>
        <label className="pricing-check"><input type="checkbox" checked={job.helpAtBothEnds} onChange={event => setJob({ ...job, helpAtBothEnds: event.target.checked })}/> Customer has people to help load <b>and</b> unload (shows a cheaper “Help &amp; Save” price)</label>
      </section>

      <section className="pricing-results">
        {!estimate ? <div className="site-admin-card pricing-card pricing-empty"><Calculator size={28}/><b>The price to quote shows here</b><span>Pick a service on the left and fill in the trip. You’ll get a low and a high price, with what it costs, what Marius makes and your commission.</span></div> : <>
          {estimate.low.price !== null && estimate.high.price !== null
            ? <div className="pricing-banner">Price range <b>{money(estimate.low.price)} – {money(estimate.high.price)}</b> before tax{estimate.commissionEligible ? '' : ' · no commission on this service'}</div>
            : null}
          <div className="pricing-pair">
            <Scenario title="Low" result={estimate.low}/>
            <Scenario title="High" result={estimate.high}/>
          </div>
          {estimate.helpAndSave ? <div className="site-admin-card pricing-card pricing-save">
            <h4>Help &amp; Save (smaller crew)</h4>
            {estimate.helpAndSave.savings
              ? <p>{money(estimate.helpAndSave.low.price)} – {money(estimate.helpAndSave.high.price)} before tax · saves the customer {money(estimate.helpAndSave.savings.low)} – {money(estimate.helpAndSave.savings.high)}</p>
              : <p>Needs review: {[...(estimate.helpAndSave.low.missing || []), ...(estimate.helpAndSave.high.missing || [])].join(', ')}</p>}
          </div> : null}
        </>}
      </section>
    </div> : null}

    {tab === 'check' ? <section className="site-admin-card pricing-card pricing-form pricing-check-card">
      <h3>Is this price high enough?</h3>
      <p className="site-admin-muted">E.g. Marius’s Grimsby → Toronto quote: C$475, about 5 dispatch hours. Shows what’s left after commission and the most the job can cost before it’s underpriced.</p>
      <div className="pricing-two">
        <NumberField label="Price before tax" value={check.price} onChange={value => setCheck({ ...check, price: value ?? '' })} suffix="$"/>
        <NumberField label="Hours for the whole trip" value={check.hours} onChange={value => setCheck({ ...check, hours: value ?? '' })} suffix="h"/>
        <NumberField label="Marius’s target per hour" value={check.target} onChange={value => setCheck({ ...check, target: value ?? '' })} suffix="$/h" hint={`Blank = ${settings.contributionPerHour.low ?? '?'} (low target)`}/>
        <NumberField label="What the job costs (if known)" value={check.direct} onChange={value => setCheck({ ...check, direct: value ?? '' })} suffix="$"/>
      </div>
      {checked ? <dl className="pricing-check-out">
        <div><dt>Your commission</dt><dd>{Math.round((checked.rate || 0) * 100)}%</dd></div>
        <div><dt>Sunwings keeps</dt><dd>{money(checked.retained)}</dd></div>
        <div><dt>Marius’s target</dt><dd>{money(checked.requiredContribution)}</dd></div>
        <div className="strong"><dt>Most the job can cost</dt><dd>{money(checked.maxDirectCost)}</dd></div>
        {checked.underpriced !== null ? <div className={checked.underpriced ? 'bad' : 'good'}><dt>Verdict</dt><dd>{checked.underpriced ? 'Too low' : 'OK'}</dd></div> : null}
      </dl> : null}
    </section> : null}

    {tab === 'rates' ? <div className="pricing-rates">
      <section className="site-admin-card pricing-card pricing-form">
        <h3>Profit target &amp; commission</h3>
        <div className="pricing-two">
          <NumberField label="Marius’s target per hour (low)" value={settings.contributionPerHour.low} onChange={value => update(['contributionPerHour', 'low'], value)} suffix="$/h" hint="What Marius wants to make per hour of a job, after costs. His brief says $50–75."/>
          <NumberField label="Marius’s target per hour (high)" value={settings.contributionPerHour.high} onChange={value => update(['contributionPerHour', 'high'], value)} suffix="$/h"/>
          <NumberField label="Smallest job: least Sunwings keeps" value={settings.serviceMinimums.default} onChange={value => update(['serviceMinimums', 'default'], value)} suffix="$" hint="Before your commission. His brief says $150 (to confirm with Marius)."/>
          <NumberField label="Sales tax (HST)" value={pct(settings.taxRate)} onChange={value => update(['taxRate'], value === null ? null : value / 100)} suffix="%"/>
        </div>
        <div className="pricing-toggle">
          <label><input type="radio" checked={settings.commission.mode !== 'tiered'} onChange={() => update(['commission', 'mode'], 'flat')}/> Flat commission</label>
          <label><input type="radio" checked={settings.commission.mode === 'tiered'} onChange={() => update(['commission', 'mode'], 'tiered')}/> 10% up to $800, 20% over (current admin rule)</label>
        </div>
        {settings.commission.mode === 'tiered'
          ? <div className="pricing-two">
            <NumberField label="Up to" value={settings.commission.threshold} onChange={value => update(['commission', 'threshold'], value)} suffix="$"/>
            <NumberField label="Rate up to it" value={pct(settings.commission.lowRate)} onChange={value => update(['commission', 'lowRate'], value === null ? null : value / 100)} suffix="%"/>
            <NumberField label="Rate over it" value={pct(settings.commission.highRate)} onChange={value => update(['commission', 'highRate'], value === null ? null : value / 100)} suffix="%"/>
          </div>
          : <NumberField label="Commission rate" value={pct(settings.commission.rate)} onChange={value => update(['commission', 'rate'], value === null ? null : value / 100)} suffix="%"/>}
        <div className="pricing-services">
          <span>Services that pay commission</span>
          {serviceOptions.map(item => <label key={item.slug}>
            <input type="checkbox" checked={!(settings.commission.excludedServices || []).includes(item.slug)} onChange={event => update(['commission', 'excludedServices'], event.target.checked ? (settings.commission.excludedServices || []).filter(slug => slug !== item.slug) : [...(settings.commission.excludedServices || []), item.slug])}/>
            {item.title}
          </label>)}
        </div>
      </section>

      <section className="site-admin-card pricing-card pricing-form">
        <h3>Van, crew &amp; where jobs start</h3>
        <div className="pricing-two">
          <label className="pricing-field"><span>Van</span><input value={settings.van.name} onChange={event => update(['van', 'name'], event.target.value)}/></label>
          <NumberField label="Van cost per km" value={settings.van.costPerKm} onChange={value => update(['van', 'costPerKm'], value)} suffix="$/km"/>
          <NumberField label="Driver pay, all in" value={settings.crew.driverHourly} onChange={value => update(['crew', 'driverHourly'], value)} suffix="$/h"/>
          <NumberField label="Helper pay, all in" value={settings.crew.helperHourly} onChange={value => update(['crew', 'helperHourly'], value)} suffix="$/h"/>
          <NumberField label="Least hours paid per worker" value={settings.crew.minimumPaidHours} onChange={value => update(['crew', 'minimumPaidHours'], value)} suffix="h"/>
        </div>
        <label className="pricing-check"><input type="checkbox" checked={settings.van.fuelIncluded !== false} onChange={event => update(['van', 'fuelIncluded'], event.target.checked)}/> Cost per km already includes fuel</label>
        {settings.van.fuelIncluded === false ? <NumberField label="Fuel per km" value={settings.van.fuelPerKm} onChange={value => update(['van', 'fuelPerKm'], value)} suffix="$/km"/> : null}
        <label className="pricing-field"><span>Where the van starts and ends the day</span><input value={settings.dispatchBase.address} onChange={event => update(['dispatchBase', 'address'], event.target.value)} placeholder="Address"/></label>
      </section>

      <section className="site-admin-card pricing-card pricing-form pricing-wide">
        <h3>Rental trucks (when the van is too small)</h3>
        {settings.rentals.map((rental, index) => {
          const set = (key, value) => update(['rentals'], settings.rentals.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
          const sample = rentalCost(rental, 30);
          return <div className="pricing-rental" key={rental.id || index}>
            <label className="pricing-field"><span>Name</span><input value={rental.label} onChange={event => set('label', event.target.value)}/></label>
            <NumberField label="Base" value={rental.base} onChange={value => set('base', value)} suffix="$"/>
            <NumberField label="Per mile" value={rental.perMile} onChange={value => set('perMile', value)} suffix="$"/>
            <NumberField label="Free miles" value={rental.includedMiles} onChange={value => set('includedMiles', value)} suffix="mi"/>
            <NumberField label="Waiver" value={rental.waiver} onChange={value => set('waiver', value)} suffix="$"/>
            <NumberField label="Fees" value={rental.fees} onChange={value => set('fees', value)} suffix="$"/>
            <small>30 miles: {sample.cost === null ? 'needs rates' : money(sample.cost)} before tax and fuel</small>
            <button type="button" className="site-admin-icon-btn" aria-label="Remove rental" onClick={() => update(['rentals'], settings.rentals.filter((_, i) => i !== index))}><Trash2 size={15}/></button>
          </div>;
        })}
        <button type="button" className="site-admin-btn secondary" onClick={() => update(['rentals'], [...settings.rentals, { id: `rental-${Date.now()}`, label: 'New rental', base: null, perMile: null, includedMiles: 0, waiver: 0, fees: 0 }])}><Plus size={15}/> Add rental</button>
      </section>
      {status.updatedAt ? <p className="site-admin-muted">Last saved {new Date(status.updatedAt).toLocaleString()}</p> : null}
    </div> : null}
  </div>;
}
