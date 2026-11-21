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
    "residential-moving": {
      "mobilePosition": ""
    },
    "furniture-delivery": {
      "mobilePosition": ""
    },
    "commercial-transport": {
      "mobilePosition": "50% 50%"
    },
    "snow-removal": {
      "mobilePosition": ""
    },
    "packing-protection": {
      "mobilePosition": ""
    },
    "warehouse-container-unloading": {
      "mobilePosition": ""
    },
    "junk-removal": {
      "mobilePosition": ""
    },
    "client-assist-moving-delivery": {
      "mobilePosition": "50% 50%"
    }
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
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/blog-images/sunwings/1794780070381-grimsby-toronto-moving-van.jpg",
      "sendList": [
        "Pickup and delivery cities and addresses, and your moving date.",
        "Home size or item list, with photos of large or awkward pieces.",
        "Stairs, elevators, parking and carrying distance at both ends."
      ],
      "intro": "Moving between Hamilton or Niagara and Toronto is a full day on the QEW, not a local job. Sunwings plans these moves as one trip with one crew: we load at your old place, drive it ourselves and unload at the new one, so your things never sit in a warehouse or change hands. You get a written quote first, based on your home, your date and the access at both ends.",
      "handleTitle": "What we move",
      "handle": [
        "Apartments, condos and townhouses",
        "Houses, including basements and garages",
        "Partial moves: a room, a storage unit, a few big pieces",
        "Students and seniors moving to or from Hamilton and Niagara",
        "Furniture bought or sold between the two regions",
        "Office and small business moves"
      ],
      "stepsTitle": "How a long-distance move works",
      "steps": [
        {
          "title": "Tell us the move",
          "text": "Both addresses, your date and the size of the home or a list of the big pieces. Photos help."
        },
        {
          "title": "Get a written quote",
          "text": "We plan the truck, crew and drive time, and send the price in writing before anything is booked."
        },
        {
          "title": "Moving day",
          "text": "We wrap and load at your old place, drive the QEW or 403 ourselves, and unload into the rooms you choose."
        },
        {
          "title": "Set up",
          "text": "Beds and tables we took apart go back together, and we take the blankets with us."
        }
      ],
      "localTitle": "Moving between Hamilton, Niagara and the GTA",
      "local": "The drive is the part people underestimate. Traffic on the QEW, the Burlington Skyway and the Gardiner can turn a one-hour trip into three, so we plan the start time around it and tell you when to expect us at the other end.\n\nAccess matters at both ends. Toronto condos usually need the elevator and loading dock booked, and some ask for a certificate of insurance. Older homes in Hamilton and Niagara often have narrow stairs or tight doorways. Tell us about both places and we plan the crew and equipment for them.",
      "quoteTitle": "What your quote is based on",
      "quoteFactors": [
        "The size of the home or the list of large items",
        "The distance and drive time between the two addresses",
        "Stairs, elevators, parking and how far we carry at each end",
        "Your date and time (weekends and month-end book up first)",
        "Extra work: disassembly, packing, a storage stop or a second drop-off"
      ],
      "faqs": [
        {
          "question": "Do you move from Hamilton or Niagara to Toronto in one day?",
          "answer": "Most moves between the two regions are done in one day with one crew and one truck. Larger homes or difficult access can take longer, and your quote will say so."
        },
        {
          "question": "Do you move the other way, from Toronto to Hamilton or Niagara?",
          "answer": "Yes. We run moves in both directions, from Toronto, Mississauga and the GTA to Hamilton, Burlington and the Niagara Region too."
        },
        {
          "question": "Will my things be transferred to another truck?",
          "answer": "No. The crew that loads your things drives them and unloads them. Nothing goes through a warehouse unless you ask for storage."
        },
        {
          "question": "How do I get a price?",
          "answer": "Send both addresses, your date and the home size or item list. You get a written quote before you book, with nothing to pay to ask."
        }
      ]
    },
    "furniture-delivery": {
      "eyebrow": "Hamilton & Niagara",
      "heading": "",
      "accent": "Hamilton & Niagara.",
      "text": "",
      "image": "",
      "intro": "Bought a couch on Marketplace in Grimsby, or a dining set from a store in Burlington? Sunwings picks up furniture across Hamilton and the Niagara Region and delivers it to your door, or to Toronto and the GTA. Two careful movers, blankets and straps, and the piece goes into the room you want, not left at the curb.",
      "handleTitle": "What we deliver",
      "handle": [
        "Marketplace and Kijiji pickups",
        "Furniture store and consignment shop purchases",
        "Sofas, sectionals and recliners",
        "Beds, mattresses and dressers",
        "Dining tables, cabinets and bookcases",
        "Appliances and other large single items"
      ],
      "stepsTitle": "How furniture delivery works",
      "steps": [
        {
          "title": "Send the details",
          "text": "A photo or link of the piece, its size, and the pickup and delivery addresses."
        },
        {
          "title": "Get a written quote",
          "text": "We confirm the van fits the piece, check the access at both ends and send the price before you book."
        },
        {
          "title": "Pickup",
          "text": "We meet the seller or store, check the piece, wrap it and strap it in the van."
        },
        {
          "title": "Delivery and placement",
          "text": "We carry it in, place it in the room you choose and take the packing with us."
        }
      ],
      "localTitle": "Furniture delivery around Hamilton and Niagara",
      "local": "A lot of what we deliver here is bought second-hand or from local shops, across towns that are spread out along the QEW. We pick up from Hamilton, Stoney Creek, Burlington, Grimsby, St. Catharines, Niagara Falls and the towns between, and deliver anywhere in the region or into Toronto and the GTA.\n\nIf you are buying from a private seller, tell us when they are home and whether the piece is upstairs or in a basement. For store pickups, send the order number and pickup window so we can book it with the store.",
      "quoteTitle": "What your quote is based on",
      "quoteFactors": [
        "How many pieces, and how big and heavy they are",
        "The distance between the pickup and the delivery",
        "Stairs, elevators and tight corners at either end",
        "Whether anything needs taking apart or putting back together",
        "Your date and pickup window"
      ],
      "faqs": [
        {
          "question": "Can you pick up from a Marketplace seller?",
          "answer": "Yes. Send us the listing or a photo, the seller’s address and when they are home, and we handle the pickup and delivery."
        },
        {
          "question": "Do you deliver from Hamilton or Niagara to Toronto?",
          "answer": "Yes. We deliver within Hamilton and Niagara and to Toronto, Mississauga and the rest of the GTA."
        },
        {
          "question": "Will you bring it inside and up the stairs?",
          "answer": "Yes. We carry it in and place it in the room you choose. Tell us about stairs, elevators and narrow doors so we bring the right crew."
        },
        {
          "question": "Can you take apart a bed or table to get it in?",
          "answer": "Yes, when it is designed to come apart. Mention it when you ask for a quote."
        }
      ]
    },
    "commercial-transport": {
      "eyebrow": "Hamilton & Niagara",
      "heading": "",
      "accent": "Hamilton & Niagara.",
      "text": "",
      "image": "",
      "intro": "Sunwings moves goods for retailers, offices, contractors and property managers across Hamilton, Burlington and the Niagara Region, and to Toronto and the GTA. One-off jobs or a regular route, with a written quote before we start.",
      "handleTitle": "What we transport",
      "handle": [
        "Store deliveries and stock transfers between locations",
        "Office furniture and equipment",
        "Building materials and contractor supplies",
        "Property turnovers: furniture in or out of units",
        "Event and display equipment",
        "Recurring routes between Hamilton, Niagara and the GTA"
      ],
      "stepsTitle": "How it works",
      "steps": [
        {
          "title": "Tell us the job",
          "text": "What is moving, how much of it, the addresses and your timing."
        },
        {
          "title": "Get a written quote",
          "text": "We plan the vehicle and crew and send the price before you book."
        },
        {
          "title": "On the day",
          "text": "We load, transport and unload, and keep you posted if anything changes."
        }
      ],
      "localTitle": "Commercial transport in Hamilton and Niagara",
      "local": "Businesses here often need goods moved between their own locations, or between the region and Toronto. We plan around loading docks, building hours and traffic on the QEW so your delivery arrives when someone is there to receive it.",
      "quoteTitle": "What your quote is based on",
      "quoteFactors": [
        "What is being moved, how much and how heavy",
        "Distance and drive time between the stops",
        "Loading access: docks, elevators, stairs and parking",
        "One-off job or a regular schedule"
      ],
      "faqs": [
        {
          "question": "Can you do a regular route?",
          "answer": "Yes. Tell us the stops and how often, and we quote it as a recurring job."
        },
        {
          "question": "Do you work outside business hours?",
          "answer": "Evenings and weekends are possible when the job needs it. Mention it when you ask for a quote."
        }
      ]
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
      "image": "https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/blog-images/sunwings/1794780070381-grimsby-toronto-moving-van.jpg",
      "linkText": "Learn more →",
      "url": "/hamilton-niagara/long-distance"
    }
  },
  "route_banners": {
    "long-distance": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "hamilton-to-toronto": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "toronto-to-hamilton": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "stoney-creek-to-toronto": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "hamilton-to-mississauga": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "st-catharines-to-toronto": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "toronto-to-st-catharines": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "niagara-falls-to-toronto": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    },
    "toronto-to-niagara-falls": {
      "image": "",
      "eyebrow": "",
      "heading": "",
      "accent": "",
      "text": ""
    }
  },
  "hn_town_banners": {}
};
