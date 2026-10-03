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
  youtubeFormat: 'video',
  mediaUrl: '',
  mediaType: 'image',
  aspectRatio: '1:1',
  audioUrl: '',
  audioName: '',
  audioMode: 'none',
  aiImagePrompt: '',
  scheduledAt: '',
  autoPublish: true,
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

export function starterCopy(title, siteKey = 'justconsignin', siteName = '') {
  const topic = title || (siteKey === 'sunwings' ? 'Reliable moving and delivery service' : siteKey === 'justindematteis' ? 'Web development and digital solutions' : 'Manage consignment inventory with Shopify');
  const brand = siteName || (siteKey === 'sunwings' ? 'Sunwings Transport' : siteKey === 'justindematteis' ? 'Justin DeMatteis' : 'JustConsignIn');

  if (siteKey === 'sunwings') {
    return {
      instagram: `${topic} with ${brand}.\n\nMoving, delivery and commercial transport support when you need it. Contact us for a quote.\n\n#Moving #Delivery #TorontoMovers #HamiltonMovers #SunwingsTransport`,
      facebook: `${topic} with ${brand}.\n\nNeed moving, delivery or commercial transport help? Send us the details and request a quote.`,
      tiktok: `${topic}. Moving and delivery with ${brand}. Request a quote at sunwingstransport.ca. #Moving #Delivery #SunwingsTransport`,
      youtubeTitle: `${topic} | ${brand}`,
      youtubeDescription: `${topic} with ${brand}.\n\nMoving, delivery and commercial transport services.\n\nLearn more: https://sunwingstransport.ca`,
    };
  }

  if (siteKey === 'justindematteis') {
    return {
      instagram: `${topic}.\n\nWeb development, ecommerce, SEO and automation work by ${brand}.\n\n#WebDevelopment #SEO #Ecommerce #Automation`,
      facebook: `${topic}.\n\nWeb development, ecommerce, SEO and automation solutions by ${brand}.`,
      tiktok: `${topic}. Web development and digital solutions by ${brand}. #WebDevelopment #Automation`,
      youtubeTitle: `${topic} | ${brand}`,
      youtubeDescription: `${topic}.\n\nWeb development and digital technology work by ${brand}.\n\nhttps://www.justindematteis.com`,
    };
  }

  return {
    instagram: `${topic} with JustConsignIn.\n\nKeep consignors, inventory, Shopify products, POS sales and payouts connected in one workflow — without duplicate entry or spreadsheets.\n\nSee the live demo and start a 14-day free trial at justconsignin.com\n\n#Shopify #ShopifyPOS #Consignment #ConsignmentSoftware #RetailTech`,
    facebook: `${topic} with JustConsignIn.\n\nManage consignors, inventory, Shopify products, POS sales and payouts in one connected workflow. No duplicate entry. No spreadsheet juggling.\n\nSee the live demo and start a 14-day free trial at justconsignin.com`,
    tiktok: `${topic}. JustConsignIn keeps the consignment workflow connected to Shopify from intake to payout. Live demo + 14-day free trial at justconsignin.com. #Shopify #Consignment #ShopifyPOS #RetailTech`,
    youtubeTitle: `${topic} | JustConsignIn`,
    youtubeDescription: `${topic} with JustConsignIn.\n\nManage consignors, inventory, Shopify POS sales and payouts in one workflow.\n\nLive demo: https://www.justconsignin.com\n14-day free trial available.`,
  };
}
