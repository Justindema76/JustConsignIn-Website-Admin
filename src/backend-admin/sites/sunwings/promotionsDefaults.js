// Starting values for Admin › Promotions & Banners. Generated from the Sunwings site's
// lib/contentDefaults.js and lib/servicePricing.js so the admin shows exactly what the
// live site uses until something is saved. Saving writes each key as JSON to
// sunwings_site_settings, which the site then uses instead of these defaults.

export const HERO_IMAGE_OPTIONS = {
  "van": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/blog-images/sunwings/1792805662384-cargo-van-driveway1.webp",
  "couple": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1792805704389-happy-couple-move-.jpg",
  "delivery": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791336064197-furniture-delivery.jpeg",
  "truck": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791340265388-long-distance.jpg",
  "packing": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791331979339-packing-protecting.webp",
  "warehouse": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791340345360-warehouse.png"
};

export const PROMOTIONS_DEFAULTS = {
  "promo_popup": {
    "enabled": true,
    "serviceSlug": "snow-removal",
    "image": "",
    "eyebrow": "Winter 2026–27 · Limited spots",
    "heading": "Never shovel again.",
    "price": "",
    "text": "Driveway, walkways and front steps cleared after every 5 cm snowfall, all season long. Now booking in Markham, Stouffville & Toronto.",
    "primary": "Book your spot",
    "plan": "Seasonal plan",
    "secondary": "See snow removal plans",
    "secondaryHref": "/services/snow-removal#plans",
    "tabLabel": ""
  },
  "hero_slides": [
    {
      "enabled": true,
      "slug": "residential-moving",
      "image": "",
      "eyebrow": "Upfront quotes · Careful crews",
      "heading": "Moving day,",
      "accent": "without the stress.",
      "text": "Careful crews, a clean truck, blankets and wrapping. Clear, upfront quotes tailored to your job.",
      "badgeTop": "",
      "badgeMain": "",
      "badgeBottom": "",
      "badgeFromPrice": false,
      "primary": "Get my moving quote",
      "plan": "",
      "secondary": "See moving services",
      "secondaryHref": ""
    },
    {
      "enabled": true,
      "slug": "furniture-delivery",
      "image": "",
      "eyebrow": "Marketplace · Kijiji · Store pickups",
      "heading": "Bought it online?",
      "accent": "We’ll bring it home.",
      "text": "Couches, beds, dressers and appliances picked up and carried in, wrapped and placed in the room you want.",
      "badgeTop": "",
      "badgeMain": "",
      "badgeBottom": "",
      "badgeFromPrice": false,
      "primary": "Book a pickup",
      "plan": "",
      "secondary": "See delivery details",
      "secondaryHref": ""
    },
    {
      "enabled": true,
      "slug": "junk-removal",
      "image": "",
      "eyebrow": "Garages · Basements · Move-outs",
      "heading": "Clear the clutter.",
      "accent": "We haul it away.",
      "text": "Old furniture, appliances and garage junk loaded up and taken away, so you don’t have to lift a thing.",
      "badgeTop": "",
      "badgeMain": "",
      "badgeBottom": "",
      "badgeFromPrice": false,
      "primary": "Get a junk removal quote",
      "plan": "",
      "secondary": "See junk removal",
      "secondaryHref": ""
    },
    {
      "enabled": true,
      "slug": "snow-removal",
      "image": "",
      "eyebrow": "Winter 2026–27 · Limited spots",
      "heading": "Never shovel",
      "accent": "again.",
      "text": "Your driveway, walkways and front steps cleared after every 5 cm snowfall. One price for the whole season. Now booking in Markham, Stouffville & Toronto.",
      "badgeTop": "",
      "badgeMain": "",
      "badgeBottom": "",
      "badgeFromPrice": true,
      "primary": "Book your spot",
      "plan": "Seasonal plan",
      "secondary": "See snow plans",
      "secondaryHref": "/services/snow-removal#plans"
    }
  ],
  "service_banners": {
    "residential-moving": { "mobilePosition": "" },
    "furniture-delivery": { "mobilePosition": "" },
    "commercial-transport": { "mobilePosition": "50% 50%" },
    "snow-removal": { "mobilePosition": "" },
    "packing-protection": { "mobilePosition": "" },
    "warehouse-container-unloading": { "mobilePosition": "" },
    "junk-removal": { "mobilePosition": "" },
    "client-assist-moving-delivery": { "mobilePosition": "50% 50%" }
  },
  "page_banners": {
    "services": {
      "eyebrow": "Our services",
      "heading": "Moving, delivery",
      "accent": "& everything in between.",
      "text": "",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791340345360-warehouse.png",
      "showServiceSlides": true
    },
    "locations": {
      "eyebrow": "Service areas",
      "heading": "Toronto to Niagara,",
      "accent": "and every stop between.",
      "text": "",
      "image": "",
      "showServiceSlides": true
    },
    "pricing": {
      "eyebrow": "Upfront pricing",
      "heading": "Straight answers",
      "accent": "on price.",
      "text": "",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1792805704389-happy-couple-move-.jpg",
      "showServiceSlides": true
    },
    "blog": {
      "eyebrow": "Moving tips",
      "heading": "Moving tips",
      "accent": "& guides.",
      "text": "",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791331979339-packing-protecting.webp",
      "showServiceSlides": false
    },
    "contact": {
      "eyebrow": "Contact",
      "heading": "Talk to",
      "accent": "the Sunwings crew.",
      "text": "Questions about a move, a delivery or snow removal? Send us a message and we’ll get back to you.",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791336064197-furniture-delivery.jpeg",
      "showServiceSlides": false
    },
    "privacy": {
      "eyebrow": "Legal",
      "heading": "Privacy",
      "accent": "policy.",
      "text": "",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791331979339-packing-protecting.webp",
      "showServiceSlides": false
    }
  },
  "pricing_panel": [
    {
      "label": "Snow removal",
      "value": "",
      "note": "Seasonal plan, Oct 15 – Mar 15"
    },
    {
      "label": "Moving & delivery",
      "value": "Free upfront quote",
      "note": "Based on crew, truck time and distance"
    },
    {
      "label": "Upfront quotes",
      "value": "Tailored to your job",
      "note": "Clear, upfront quotes tailored to your job."
    }
  ],
  "price_match": {
    "enabled": false,
    "eyebrow": "Price-match guarantee",
    "heading": "We match any lower written quote.",
    "text": "Found a lower price somewhere else? Don’t book with them yet. Show us their written quote for the same job and we’ll match it.",
    "steps": [
      {
        "title": "Get a written quote",
        "text": "Get a written quote from another moving or delivery company for your job."
      },
      {
        "title": "Send it to us",
        "text": "Attach it or mention it when you request your Sunwings quote, before you book."
      },
      {
        "title": "We match the price",
        "text": "If it’s for the same job, we match it. Same crew, same care, lower price."
      }
    ],
    "rulesTitle": "What counts",
    "rules": [
      "The quote must be in writing (email, PDF or on the company’s letterhead).",
      "It must be for the same job: same date, addresses, crew size, truck size and services.",
      "It must come from a real, licensed and insured local company.",
      "Send it to us before your job is booked."
    ],
    "button": "Get my quote and price match"
  },
  "trust_links": [
    {
      "title": "Google reviews",
      "text": "Trusted by local customers",
      "href": "https://search.google.com/local/reviews?placeid=ChIJXTBVHE3zTkcRiUEmU5P3CsI"
    },
    {
      "title": "Upfront quotes",
      "text": "Clear, upfront quotes tailored to your job.",
      "href": "/pricing"
    },
    {
      "title": "Flexible scheduling",
      "text": "Evenings & weekends",
      "href": ""
    },
    {
      "title": "Toronto to Niagara",
      "text": "GTA, Hamilton & beyond",
      "href": "https://www.google.com/maps?cid=13982260205252395401"
    }
  ],
  "snow_pricing": {
    "label": "Snow Removal",
    "eyebrow": "Snow removal pricing",
    "heading": "Residential snow removal from $175/month.",
    "text": "Keep your driveway and walkways clear this winter. Sign up once for the season and we clear your property after every snowfall. Limited spots available.",
    "cards": [
      {
        "title": "Seasonal plan",
        "subtitle": "Residential driveways",
        "prefix": "from",
        "amount": "$175",
        "unit": "/month",
        "note": "season runs Oct 15 – Mar 15",
        "features": [
          "Driveway clearing",
          "Walkways and front steps",
          "Snowblower + hand shovelling",
          "5 cm snowfall trigger",
          "Target clearing within 6–8 hours after snowfall ends",
          "Reliable, professional service"
        ],
        "buttonText": "Book now",
        "featured": true
      },
      {
        "title": "One-time clear",
        "subtitle": "One storm, no contract",
        "amount": "Quote",
        "note": "based on the property",
        "features": [
          "Driveway, walkways and front steps",
          "Book when you need it",
          "Scheduled after the storm"
        ],
        "buttonText": "Get a quote"
      },
      {
        "title": "Large & corner lots",
        "subtitle": "Bigger properties",
        "amount": "Quote",
        "note": "priced on the property",
        "features": [
          "Long or extra-wide driveways",
          "Corner lots and extra walkways",
          "Multiple properties"
        ],
        "buttonText": "Get a quote"
      }
    ],
    "details": [
      {
        "label": "Snow trigger",
        "value": "5 cm",
        "note": "service starts automatically"
      },
      {
        "label": "Cleaning",
        "value": "6–8 hours",
        "note": "after snowfall ends"
      },
      {
        "label": "Season",
        "value": "Oct 15 – Mar 15",
        "note": "most areas"
      }
    ],
    "regions": [],
    "footnote": "Prices in CAD. Final price is confirmed once we see the property. Cleaning times are a service target and can be affected by severe weather, road access and municipal plowing."
  },
  "snow_page": {
    "hero_title": "",
    "intro": "",
    "seo_title": "",
    "seo_description": "",
    "bullets": [],
    "body_html": "",
    "faq": []
  },
  "hn_content": {
    "theme": {
      "scheme": "blackgold",
      "badge": "Hamilton & Niagara",
      "mainBadge": "Toronto & GTA",
      "backLabel": "",
      "topbarLine": "Hamilton & Niagara moving and transport",
      "accent": "",
      "accent2": "",
      "accentInk": "",
      "navy": "",
      "blue": "",
      "topbar": "",
      "topbarInk": "",
      "header": ""
    },
    "home": {
      "eyebrow": "Hamilton · Burlington · Grimsby · Niagara",
      "heading": "Hamilton & Niagara",
      "accent": "movers & transport.",
      "text": "Long-distance moves, furniture delivery and large-item transport across Hamilton and the Niagara Region, and to Toronto and the GTA. Tell us where it’s going and get a tailored quote.",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/blog-images/sunwings/1792805164536-image.png",
      "cards": [
        {
          "title": "Long-distance moves",
          "text": "Full home moves between Hamilton or Niagara and Toronto, Mississauga and the GTA, planned around access at both ends.",
          "href": "/hamilton-niagara/long-distance",
          "cta": "Long-distance moving"
        },
        {
          "title": "Furniture & store delivery",
          "text": "Store pickups, Marketplace finds and single large items brought from anywhere in the region and placed in the room you want.",
          "href": "/hamilton-niagara/furniture-delivery",
          "cta": "Furniture delivery"
        },
        {
          "title": "Commercial & large-item transport",
          "text": "Office moves, equipment, inventory and business deliveries between cities, one-off or on a schedule.",
          "href": "/hamilton-niagara/commercial-transport",
          "cta": "Commercial transport"
        }
      ],
      "faqs": [
        {
          "question": "Do you move between Niagara and Toronto?",
          "answer": "Yes. Moves and deliveries between the Niagara Region, Hamilton and Toronto or the GTA are our main long-distance routes. Send both addresses and your date for a tailored quote."
        },
        {
          "question": "Which towns do you cover in Hamilton and Niagara?",
          "answer": "Hamilton, Stoney Creek, Ancaster, Dundas, Waterdown, Burlington, Grimsby, Lincoln, St. Catharines, Niagara Falls, Welland, Thorold and Fort Erie, plus nearby towns on request."
        },
        {
          "question": "Can you deliver one large item from Hamilton or Niagara to Toronto?",
          "answer": "Yes. Furniture, appliances and other large items can be picked up and delivered between cities. Tell us the item, size, stairs and both addresses."
        },
        {
          "question": "How is a long-distance quote priced?",
          "answer": "It depends on the route, the amount being moved, the crew and vehicle needed, and access at both ends. You get a written quote before anything is booked."
        }
      ]
    },
    "long-distance": {
      "eyebrow": "Hamilton & Niagara",
      "heading": "Long-distance moving",
      "accent": "Hamilton & Niagara ↔ Toronto.",
      "text": "Full home moves between Hamilton, Burlington, Grimsby, St. Catharines, Niagara Falls and Toronto, Mississauga and the GTA. Planned around access at both ends, quoted in writing before you book.",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/blog-images/sunwings/1794229390663-IMG_8141.jpeg",
      "sendList": [
        "Pickup and delivery cities and addresses, and your moving date.",
        "Home size or item list, with photos of large or awkward pieces.",
        "Stairs, elevators, parking and carrying distance at both ends."
      ]
    },
    "furniture-delivery": {
      "eyebrow": "Hamilton & Niagara",
      "heading": "",
      "accent": "Hamilton & Niagara.",
      "text": "",
      "image": ""
    },
    "commercial-transport": {
      "eyebrow": "Hamilton & Niagara",
      "heading": "",
      "accent": "Hamilton & Niagara.",
      "text": "",
      "image": ""
    },
    "towns": {
      "image": ""
    },
    "routes": {
      "image": ""
    },
    "servicesCard": {
      "enabled": true,
      "title": "Long-Distance Moving",
      "text": "Moving between Hamilton, Niagara and Toronto or the GTA? One crew loads, drives and unloads, with a written quote before you book.",
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/blog-images/sunwings/1794229390663-IMG_8141.jpeg",
      "linkText": "Learn more →",
      "url": "/hamilton-niagara/long-distance"
    }
  },
  "route_banners": {
    "long-distance": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "hamilton-to-toronto": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "toronto-to-hamilton": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "stoney-creek-to-toronto": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "hamilton-to-mississauga": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "st-catharines-to-toronto": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "toronto-to-st-catharines": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "niagara-falls-to-toronto": {"image":"","eyebrow":"","heading":"","accent":"","text":""},
    "toronto-to-niagara-falls": {"image":"","eyebrow":"","heading":"","accent":"","text":""}
  },
  "hn_town_banners": {}
};
