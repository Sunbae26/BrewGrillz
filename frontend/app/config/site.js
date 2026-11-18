// Single source of truth for restaurant info (from the Jan 2026 dining menu + current site)
export const site = {
  name: 'BrewGrillz',
  tagline: 'Chill it. Grill it. Luv it.',
  descriptor: 'Finest Grill Dining & Bar',
  address: { line1: '163 Rochor Road', line2: 'Bugis Street', city: 'Singapore 188438' },
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=BrewGrillz+163+Rochor+Road+Singapore+188438',
  mapsEmbed: 'https://www.google.com/maps?q=163+Rochor+Road+Singapore+188438&output=embed',
  reviewUrl: 'https://www.google.com/maps/search/?api=1&query=BrewGrillz+Singapore',
  phone: '+65 6312 2847',
  phoneHref: 'tel:+6563122847',
  whatsapp: '+65 8770 2077',
  whatsappHref: 'https://wa.me/6587702077',
  email: 'info@brewgrillz.sg',
  hours: [
    { label: 'Open daily', value: '10:00am – 11:00pm' },
    { label: 'Kitchen', value: '11:30am – 10:30pm' },
  ],
  socials: {
    instagram: 'https://www.instagram.com/brewgrillz',
    tiktok: 'https://www.tiktok.com/@brewgrillz',
    facebook: 'https://www.facebook.com/brewgrillz.sg',
  },
  // Hero background video: put the file at frontend/public/media/hero.mp4 (muted loop, ~10–20s, 1080p, under ~6 MB)
  // and change this to '/media/hero.mp4'. While it's null, only the poster photo is shown (no wasted request).
  heroVideo: null,
  heroPoster: { src: '/images/food/mixed-grill-platter.webp', sm: '/images/food/mixed-grill-platter-sm.webp', xs: '/images/food/mixed-grill-platter-xs.webp' },
  // Online orders are PICKUP ONLY. Delivery goes through the partners below.
  // TODO: replace with BrewGrillz's exact store links from the client.
  delivery: {
    grab: 'https://food.grab.com/sg/en/',
    foodpanda: 'https://www.foodpanda.sg/',
  },
  priceNote: 'Prices include GST. 10% service charge applies to dine-in only.',
}

export const nav = [
  { label: 'Menu', to: '/menu' },
  { label: 'Bar', to: '/bar' },
  { label: 'Our Place', to: '/our-place' },
  { label: 'Events', to: '/events' },
  { label: 'Rewards', to: '/rewards' },
]
