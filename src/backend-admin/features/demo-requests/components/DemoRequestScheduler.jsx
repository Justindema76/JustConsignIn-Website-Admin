import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { scheduleDemoRequest } from '../demoRequests.service';
import './DemoRequestScheduler.css';

function localDateTimeValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function currentLocalMinimum() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
  } catch {
    return 'America/Toronto';
  }
}

export default function DemoRequestScheduler({ request, accessToken, onCancel, onScheduled }) {
  const [scheduledAt, setScheduledAt] = useState(localDateTimeValue(request?.scheduled_at));
  const [durationMinutes, setDurationMinutes] = useState(request?.scheduled_duration_minutes || 30);
  const [timezone, setTimezone] = useState(request?.scheduled_timezone || browserTimezone());
  const [location, setLocation] = useState(request?.scheduled_location || '');
  const [notes, setNotes] = useState(request?.scheduled_notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const minDateTime = useMemo(() => currentLocalMinimum(), []);

  useEffect(() => {
    setScheduledAt(localDateTimeValue(request?.scheduled_at));
    setDurationMinutes(request?.scheduled_duration_minutes || 30);
    setTimezone(request?.scheduled_timezone || browserTimezone());
    setLocation(request?.scheduled_location || '');
    setNotes(request?.scheduled_notes || '');
    setError('');
  }, [request?.id, request?.scheduled_at, request?.scheduled_duration_minutes, request?.scheduled_timezone, request?.scheduled_location, request?.scheduled_notes]);

  const submit = async event => {
    event.preventDefault();
    if (!request?.id || !accessToken || saving) return;
    const parsed = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(parsed.getTime())) {
      setError('Choose a valid date and time.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = await scheduleDemoRequest(accessToken, {
        requestId: request.id,
        scheduledAt: parsed.toISOString(),
        durationMinutes: Number(durationMinutes),
        timezone,
        location,
        notes,
      });
      onScheduled?.(payload);
    } catch (err) {
      setError(err?.message || 'Unable to schedule demo.');
    } finally {
      setSaving(false);
    }
  };

  return <form className="demo-scheduler" onSubmit={submit}>
    <div className="demo-scheduler-head">
      <div>
        <p className="site-admin-eyebrow">Schedule demo</p>
        <h3>{request?.scheduled_at ? 'Reschedule customer demo' : 'Schedule customer demo'}</h3>
        <p>Save the appointment and send the customer a confirmation with a calendar invite.</p>
      </div>
      <button type="button" className="demo-scheduler-close" onClick={onCancel} aria-label="Close scheduler"><X size={18}/></button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}

    <div className="demo-scheduler-fields">
      <label>
        <span>Date &amp; time</span>
        <input type="datetime-local" required min={minDateTime} value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} />
      </label>
      <label>
        <span>Duration</span>
        <select value={durationMinutes} onChange={event => setDurationMinutes(Number(event.target.value))}>
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">60 minutes</option>
          <option value="90">90 minutes</option>
        </select>
      </label>
      <label className="wide">
        <span>Timezone</span>
        <input required value={timezone} onChange={event => setTimezone(event.target.value)} placeholder="America/Toronto" />
        <small>The browser timezone is filled automatically. Change it only if the appointment is being scheduled in another timezone.</small>
      </label>
      <label className="wide">
        <span>Meeting link or location <small>optional</small></span>
        <input value={location} onChange={event => setLocation(event.target.value)} placeholder="https://meet.google.com/... or phone / store location" />
      </label>
      <label className="wide">
        <span>Message to customer <small>optional</small></span>
        <textarea rows="5" value={notes} onChange={event => setNotes(event.target.value)} maxLength="6000" placeholder="Anything the customer should know before the demo…" />
      </label>
    </div>

    <div className="demo-scheduler-foot">
      <p>The customer will receive an email from the mailbox configured in <strong>Settings → Email</strong>, plus a <strong>.ics calendar invite</strong>.</p>
      <div className="demo-scheduler-actions">
        <button type="button" className="site-admin-btn secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="site-admin-btn" disabled={saving}><CalendarCheck size={15}/>{saving ? 'Scheduling…' : request?.scheduled_at ? 'Update & Send Invite' : 'Schedule & Send Invite'}</button>
      </div>
    </div>
  </form>;
}
