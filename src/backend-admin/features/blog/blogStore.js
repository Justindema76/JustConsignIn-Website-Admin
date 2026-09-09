export const BLOG_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

export const EMPTY_POST = {
  id: '', title: '', slug: '', excerpt: '', seoTitle: '', seoDescription: '',
  category: 'Shopify Consignment', tags: [], featuredImage: '', body: '',
  status: BLOG_STATUS.DRAFT, authorName: 'JustConsignIn', publishedAt: '', createdAt: '', updatedAt: '',
};

export const FIRST_BLOG_POST = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'how-to-manage-consignment-inventory-with-shopify-pos',
  title: 'How to Manage Consignment Inventory with Shopify POS',
  excerpt: 'A practical workflow for consignment stores using Shopify POS to manage consignors, item intake, sales, commissions and payouts without losing track of who owns what.',
  seoTitle: 'How to Manage Consignment Inventory with Shopify POS | JustConsignIn',
  seoDescription: 'Learn a practical Shopify POS consignment workflow for consignor intake, inventory tracking, sales, commissions and payouts.',
  category: 'Shopify Consignment',
  tags: ['Shopify', 'Shopify POS', 'Consignment Inventory', 'Consignor Management'],
  featuredImage: '',
  body: `Running a consignment store is different from running a standard retail store. You are not simply buying inventory, putting it on a shelf and selling it. Every item still belongs to a consignor until it sells, and every sale creates another responsibility: tracking the sale, calculating the consignor's share and eventually paying them correctly.

Shopify is excellent at handling products, inventory and checkout. The challenge is connecting those retail tools to the consignor side of the business. A good consignment workflow needs to keep both sides connected from the moment an item enters the store until the consignor is paid.

Start with the consignor, not the product

Before creating products, create a consistent record for every consignor. Each consignor should have a unique number or ID along with their name, contact information, commission percentage and any notes that matter to your store.

That consignor record becomes the anchor for everything that follows. When an item is entered, it should always be connected to the correct consignor. This is what allows you to answer basic questions quickly: Who owns this item? What percentage do they receive? Which of their items have sold? How much do we currently owe them?

Create the consignment item and the Shopify product together

The next step is item intake. Instead of entering information in one system for consignment tracking and then entering it again in Shopify, the better workflow is to capture the information once and use it to create the Shopify product.

For each item, record the item number, title, description, category, size, condition, price and any other details your store needs. If the item will be sold through Shopify POS, the product can then be created in Shopify and made available to the POS sales channel.

This is especially useful when intake happens away from a desktop computer. A mobile-friendly intake process lets staff photograph an item, enter its details and create the product while standing beside the inventory instead of carrying handwritten notes back to a computer.

Keep the consignor relationship attached to the item

Shopify needs to know what the product is. Your consignment system needs to know who owns it. Those two pieces of information should never become separated.

A consignment item should maintain its own internal item number and consignor relationship even after a Shopify product is created. That way a sale can always be traced back from the Shopify transaction to the original consignor.

Record the sale and calculate the consignor share

When an item sells through Shopify POS, the consignment record should move from available inventory to sold inventory. The sale price, sale date and sales channel should be recorded.

From there, the consignor's amount can be calculated using the commission percentage attached to the consignor or item. For example, if an item sells for $100 and the consignor receives 50 percent, the system should immediately show $50 as owed to that consignor.

The item should remain in a sold-but-unpaid state until that amount is actually included in a payout. This distinction matters. A sold item and a paid consignor are not the same thing.

Group unpaid sales into payouts

Once several items have sold, the store should be able to view everything currently owed to each consignor. Instead of manually checking individual sales, the payout screen should group unpaid sold items by consignor and calculate the total due.

When payment is made by cash, e-transfer, store credit or another method, the payout should create a permanent history showing which items were included, how much was paid and when the payment occurred.

This gives both the store and the consignor a clear record of what happened.

Why this workflow matters

The biggest risk in consignment is not usually the checkout itself. It is losing the connection between inventory, ownership, sales and payouts as the store gets busier.

A connected Shopify consignment workflow reduces duplicate data entry and makes it much easier to answer the questions that matter every day. What inventory is available? Which consignor owns it? What sold? What do we owe? What has already been paid?

That is the problem JustConsignIn is being built to solve. It connects consignor intake, item tracking, Shopify product creation, Shopify POS sales and payouts so the consignment side of the business stays attached to the retail side from beginning to end.`,
  status: BLOG_STATUS.PUBLISHED,
  authorName: 'JustConsignIn',
  publishedAt: '2026-09-06T21:30:00.000Z',
  createdAt: '2026-09-06T21:30:00.000Z',
  updatedAt: '2026-09-06T21:30:00.000Z',
};

export function slugify(value = '') {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function normalizeBlogPost(row = {}) {
  return {
    ...EMPTY_POST,
    id: row.id || '', title: row.title || '', slug: row.slug || '', excerpt: row.excerpt || '',
    seoTitle: row.seo_title ?? row.seoTitle ?? '', seoDescription: row.seo_description ?? row.seoDescription ?? '',
    category: row.category || 'Shopify Consignment', tags: Array.isArray(row.tags) ? row.tags : [],
    featuredImage: row.featured_image ?? row.featuredImage ?? '', body: row.body || '',
    status: row.status === BLOG_STATUS.PUBLISHED ? BLOG_STATUS.PUBLISHED : BLOG_STATUS.DRAFT,
    authorName: row.author_name ?? row.authorName ?? 'JustConsignIn',
    publishedAt: row.published_at ?? row.publishedAt ?? '', createdAt: row.created_at ?? row.createdAt ?? '', updatedAt: row.updated_at ?? row.updatedAt ?? '',
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Blog request failed');
  return payload;
}

export async function loadPublishedBlogPosts() {
  try {
    const payload = await parseResponse(await fetch('/api/blog'));
    const posts = Array.isArray(payload.posts) ? payload.posts.map(normalizeBlogPost) : [];
    return posts.length ? posts : [FIRST_BLOG_POST];
  } catch {
    return [FIRST_BLOG_POST];
  }
}

export async function loadPublishedBlogPost(slug) {
  try {
    const payload = await parseResponse(await fetch(`/api/blog?slug=${encodeURIComponent(slug)}`));
    return normalizeBlogPost(payload.post || {});
  } catch (error) {
    if (slug === FIRST_BLOG_POST.slug) return FIRST_BLOG_POST;
    throw error;
  }
}

export async function loadAdminBlogPosts(accessToken) {
  const payload = await parseResponse(await fetch('/api/admin/blog', { headers: { Authorization: `Bearer ${accessToken}` } }));
  return Array.isArray(payload.posts) ? payload.posts.map(normalizeBlogPost) : [];
}

export async function saveAdminBlogPost(accessToken, input) {
  const post = { ...input, slug: slugify(input.slug || input.title) };
  const payload = await parseResponse(await fetch('/api/admin/blog', {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(post),
  }));
  return normalizeBlogPost(payload.post || {});
}

export async function deleteAdminBlogPost(accessToken, id) {
  await parseResponse(await fetch(`/api/admin/blog?id=${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
  }));
}

export function createEmptyPost() { return { ...EMPTY_POST, tags: [] }; }

export const BLOG_STORAGE_NOTE = 'Database-backed blog. Drafts and published articles are stored in Supabase; public readers only receive published posts.';
