export const EMPTY_CAMPAIGN = {
  id: '',
  title: '',
  status: 'draft',
  platforms: ['instagram', 'tiktok'],
  instagramCaption: '',
  facebookCaption: '',
  tiktokCaption: '',
  youtubeTitle: '',
  youtubeDescription: '',
  mediaUrl: '',
  mediaType: 'image',
  aspectRatio: '1:1',
  audioUrl: '',
  audioName: '',
  audioMode: 'none',
  aiImagePrompt: '',
  scheduledAt: '',
  autoPublish: false,
  metricoolPosts: [],
  lastError: '',
  createdAt: '',
  updatedAt: '',
};

export function dateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function torontoIso(local) {
  if (!local) return '';
  const [date, time] = local.split('T');
  if (!date || !time) return '';
  const probe = new Date(`${date}T${time}:00-04:00`);
  return Number.isNaN(probe.getTime()) ? '' : probe.toISOString();
}

export function starterCopy(title) {
  const topic = title || 'Manage consignment inventory with Shopify';
  return {
    instagram: `${topic} with JustConsignIn.\n\nKeep consignors, inventory, Shopify products, POS sales and payouts connected in one workflow — without duplicate entry or spreadsheets.\n\nSee the live demo and start a 14-day free trial at justconsignin.com\n\n#Shopify #ShopifyPOS #Consignment #ConsignmentSoftware #RetailTech`,
    facebook: `${topic} with JustConsignIn.\n\nManage consignors, inventory, Shopify products, POS sales and payouts in one connected workflow. No duplicate entry. No spreadsheet juggling.\n\nSee the live demo and start a 14-day free trial at justconsignin.com`,
    tiktok: `${topic}. JustConsignIn keeps the consignment workflow connected to Shopify from intake to payout. Live demo + 14-day free trial at justconsignin.com. #Shopify #Consignment #ShopifyPOS #RetailTech`,
    youtubeTitle: `${topic} | JustConsignIn`,
    youtubeDescription: `${topic} with JustConsignIn.\n\nManage consignors, inventory, Shopify POS sales and payouts in one workflow.\n\nLive demo: https://www.justconsignin.com\n14-day free trial available.`,
  };
}
