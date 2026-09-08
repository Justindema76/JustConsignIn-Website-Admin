insert into public.blog_posts (
  id,
  slug,
  title,
  excerpt,
  seo_title,
  seo_description,
  category,
  tags,
  featured_image,
  body,
  status,
  author_name,
  published_at,
  created_at,
  updated_at
) values (
  '11111111-1111-4111-8111-111111111111',
  'how-to-manage-consignment-inventory-with-shopify-pos',
  'How to Manage Consignment Inventory with Shopify POS',
  'A practical workflow for consignment stores using Shopify POS to manage consignors, item intake, sales, commissions and payouts without losing track of who owns what.',
  'How to Manage Consignment Inventory with Shopify POS | JustConsignIn',
  'Learn a practical Shopify POS consignment workflow for consignor intake, inventory tracking, sales, commissions and payouts.',
  'Shopify Consignment',
  array['Shopify','Shopify POS','Consignment Inventory','Consignor Management']::text[],
  '',
  $body$Running a consignment store is different from running a standard retail store. You are not simply buying inventory, putting it on a shelf and selling it. Every item still belongs to a consignor until it sells, and every sale creates another responsibility: tracking the sale, calculating the consignor's share and eventually paying them correctly.

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

That is the problem JustConsignIn is being built to solve. It connects consignor intake, item tracking, Shopify product creation, Shopify POS sales and payouts so the consignment side of the business stays attached to the retail side from beginning to end.$body$,
  'published',
  'JustConsignIn',
  '2026-09-06T21:30:00.000Z'::timestamptz,
  '2026-09-06T21:30:00.000Z'::timestamptz,
  '2026-09-06T21:30:00.000Z'::timestamptz
)
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  category = excluded.category,
  tags = excluded.tags,
  featured_image = excluded.featured_image,
  body = excluded.body,
  status = excluded.status,
  author_name = excluded.author_name,
  published_at = excluded.published_at,
  updated_at = excluded.updated_at;
