import { CheckCircle2, CircleAlert } from 'lucide-react';

function Field({ label, children, hint }) {
  return <label className="content-builder-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export default function SeoPanel({ seo, onChange, blocks }) {
  const update = (key, value) => onChange({ ...seo, [key]: value });
  const imageBlocks = blocks.filter(block => block.type === 'image');
  const checks = [
    { ok: Boolean(seo.title?.trim()), label: 'SEO title added' },
    { ok: Boolean(seo.description?.trim()), label: 'Meta description added' },
    { ok: Boolean(seo.primaryPhrase?.trim()), label: 'Primary search phrase defined' },
    { ok: blocks.some(block => block.type === 'heading'), label: 'Heading structure present' },
    { ok: blocks.some(block => block.type === 'cta' || block.type === 'related-links'), label: 'Internal CTA or links included' },
    { ok: !imageBlocks.length || imageBlocks.every(block => block.data.alt?.trim()), label: 'Article images have alt text' },
  ];

  return <>
    <Field label="SEO title" hint={`${seo.title?.length || 0} characters`}><input value={seo.title || ''} onChange={event => update('title', event.target.value)}/></Field>
    <Field label="Meta description" hint={`${seo.description?.length || 0} characters`}><textarea rows="5" value={seo.description || ''} onChange={event => update('description', event.target.value)}/></Field>
    <Field label="Primary search phrase"><input value={seo.primaryPhrase || ''} onChange={event => update('primaryPhrase', event.target.value)} placeholder="e.g. consignment drop off organization"/></Field>
    <Field label="Related phrases"><textarea rows="4" value={seo.relatedPhrases || ''} onChange={event => update('relatedPhrases', event.target.value)} placeholder="One phrase per line"/></Field>

    <div className="content-builder-seo-checks">
      <h3>SEO Checklist</h3>
      {checks.map(check => <div className={check.ok ? 'ok' : 'warn'} key={check.label}>
        {check.ok ? <CheckCircle2 size={16}/> : <CircleAlert size={16}/>}<span>{check.label}</span>
      </div>)}
    </div>
  </>;
}
