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
      "eyebrow": "Upfront quotes · Price-match guarantee",
      "heading": "Moving day,",
      "accent": "without the stress.",
      "text": "Careful crews, a clean truck, blankets and wrapping. Get an upfront quote, and show us a lower written quote for the same job and we’ll match it.",
      "badgeTop": "We match",
      "badgeMain": "Any",
      "badgeBottom": "lower written quote",
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
      "eyebrow": "Upfront pricing · Price-match guarantee",
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
      "label": "Price-match guarantee",
      "value": "We match any lower written quote",
      "note": "Show us a lower written quote for the same job and we’ll match it."
    }
  ],
  "price_match": {
    "enabled": true,
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
      "title": "Price-match guarantee",
      "text": "We match any lower written quote",
      "href": "/pricing#price-match"
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
    "regions": [
      {
        "label": "Markham & Stouffville",
        "places": [
          {
            "label": "Markham",
            "href": "/locations/markham"
          },
          {
            "label": "Stouffville"
          },
          {
            "label": "Richmond Hill",
            "href": "/locations/richmond-hill"
          }
        ]
      },
      {
        "label": "Toronto",
        "places": [
          {
            "label": "Scarborough",
            "href": "/locations/scarborough"
          },
          {
            "label": "North York",
            "href": "/locations/north-york"
          },
          {
            "label": "Toronto",
            "href": "/locations/toronto"
          }
        ]
      }
    ],
    "footnote": "Prices in CAD. Final price is confirmed once we see the property. Cleaning times are a service target and can be affected by severe weather, road access and municipal plowing."
  },
  "snow_page": {
    "seo_title": "Snow Removal Markham, Stouffville & Toronto | From $175/Month | Sunwings Transport",
    "seo_description": "Residential snow removal in Markham, Stouffville, Richmond Hill, Scarborough and North York from $175/month. Driveway, walkways and front steps cleared after every 5 cm snowfall. Limited spots.",
    "hero_title": "Residential Snow Removal in Markham, Stouffville & Toronto",
    "intro": "Keep your driveway and walkways clear this winter. Sunwings Transport clears your driveway, walkways and front steps after every 5 cm snowfall, with target clearing within 6–8 hours after the snow stops. Now booking in Markham, Stouffville, Richmond Hill, Scarborough and North York.",
    "bullets": [
      "Driveway snow removal",
      "Walkways and front steps",
      "Snowblower + hand shovelling",
      "5 cm snowfall trigger",
      "Target clearing within 6–8 hours after snowfall ends",
      "Reliable, professional service"
    ],
    "body_html": "<h2>How the seasonal plan works</h2><p>Sign up once for the season (October 15 to March 15 in most areas). When 5 cm or more of snow falls, your property is added to the route automatically, so there is no need to call after every storm. We clear your driveway, walkways and front steps using a snowblower and hand shovelling, with a target of 6–8 hours after the snowfall ends.</p><p>Spots are limited each season, so book early to secure your place on the route.</p>",
    "faq": [
      {
        "question": "How much does snow removal cost?",
        "answer": "The seasonal plan starts at $175/month for a residential driveway, walkways and front steps. Larger driveways and corner lots are quoted based on the property."
      },
      {
        "question": "Do you offer snow removal in Stouffville?",
        "answer": "Yes. We clear residential driveways, walkways and front steps across Stouffville, including Ballantrae, as part of our Markham and Stouffville route."
      },
      {
        "question": "When does the season run?",
        "answer": "October 15 to March 15 in most areas."
      },
      {
        "question": "When do you come out?",
        "answer": "Service starts automatically when 5 cm or more of snow falls. We aim to clear your property within 6–8 hours after the snowfall ends."
      },
      {
        "question": "Which areas do you cover?",
        "answer": "Markham, Stouffville and Richmond Hill in York Region, and Scarborough, North York and Toronto."
      }
    ]
  }
};
