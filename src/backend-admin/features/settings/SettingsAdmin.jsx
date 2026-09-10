import { Mail, Settings as SettingsIcon } from 'lucide-react';
import EmailSettingsForm from './email/EmailSettingsForm';
import './settings.css';

export default function SettingsAdmin() {
  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Configuration</p>
        <h1>Settings</h1>
        <p>Set up reusable website services here instead of hard-coding them into the app.</p>
      </div>
      <span className="settings-page-icon" aria-hidden="true"><SettingsIcon size={22}/></span>
    </div>

    <div className="settings-tabs" role="tablist" aria-label="Website settings">
      <span className="settings-tab active" role="tab" aria-selected="true"><Mail size={16}/> Email</span>
    </div>

    <EmailSettingsForm />
  </>;
}
