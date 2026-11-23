// Home-page content. Prices + dishes from "BGZ Dining Menu – Revamped Jan 2026".
export const img = (name) => ({ src: `/images/food/${name}.webp`, sm: `/images/food/${name}-sm.webp`, xs: `/images/food/${name}-xs.webp` })
// Real photos of the restaurant (edited for warm, even light)
export const place = (name) => ({ src: `/images/place/${name}.webp`, sm: `/images/place/${name}-sm.webp`, xs: `/images/place/${name}-xs.webp` })

export const mainEvent = [
  {
    id: 'tenderloin',
    name: 'Grass-Fed Tenderloin',
    short: 'Tenderloin',
    weight: '200g',
    price: '39.9',
    tag: "Chef's Pick",
    desc: 'The premium cut, cooked to your liking, with truffle-infused potato purée and a creamy mushroom sauce.',
    image: img('tenderloin'),
    focus: '50% 74%',
  },
  {
    id: 'sirloin',
    name: 'Sirloin Steak',
    short: 'Sirloin',
    weight: '200g',
    price: '23.9',
    tag: 'Bold & beefy',
    desc: 'Seasoned, seared to your doneness and served with your choice of sides and sauce. Rich marbling, big flavour.',
    image: img('sirloin'),
    focus: '50% 70%',
  },
  {
    id: 'ribs',
    name: 'BBQ Pork Ribs',
    short: 'BBQ Ribs',
    weight: 'Full slab',
    price: '38.9',
    tag: 'Fall-off-the-bone',
    desc: 'Glazed in smoky BBQ sauce with creamy coleslaw and sweet corn on the cob. Half slab $22.8.',
    image: img('bbq-ribs'),
  },
  {
    id: 'mixed-grill',
    name: 'Mixed Grill Platter',
    short: 'Mixed Grill',
    weight: '3–4 pax',
    price: '88',
    tag: 'For the squad',
    desc: 'Chicken thighs, chargrilled prawns, seared salmon, spicy lamb koftas and BBQ pork ribs, with two sides.',
    image: img('mixed-grill-platter'),
  },
]

export const categories = [
  { id: 'grill', title: 'Steaks & Grills', note: 'from $15.9', image: img('sirloin'), sticker: 'Flame-grilled' },
  { id: 'pizza', title: 'Pizza', note: '10" · from $16.9', image: img('honey-garlic-pizza'), sticker: 'Signature' },
  { id: 'pasta', title: 'Pasta', note: 'from $16.9', image: img('carbonara'), sticker: 'Al dente' },
  { id: 'burgers', title: 'Burgers', note: 'Raclette · from $18.9', image: img('beef-burger'), sticker: 'Cheesy!' },
  { id: 'bites', title: 'Bites', note: 'from $8.5', image: img('chicken-wings'), sticker: 'Share it' },
]

export const platters = [
  {
    id: 'meat',
    name: 'Meat Platter',
    price: '68',
    pax: '3–4',
    image: img('meat-platter'),
    items: ['Herb-marinated chicken thighs', 'Grilled striploin, BBQ glaze', 'Spicy lamb koftas', 'Crispy pork belly, honey-soy', '2 sides + dipping sauces'],
  },
  {
    id: 'mixed',
    name: 'Mixed Grill Platter',
    price: '88',
    pax: '3–4',
    image: img('mixed-grill-platter'),
    items: ['Herb-marinated chicken thighs', 'Chargrilled garlic-lemon prawns', 'Seared salmon, dill cream', 'Spicy lamb koftas', 'BBQ glazed pork ribs + 2 sides'],
  },
]

export const taps = [
  { name: 'Golden Ale', style: 'English-style golden', abv: '4.9', notes: 'Biscuit malt, smooth bitterness, mild floral & citrus.', color: '#f2a516', fill: 0.86 },
  { name: 'What the Helles', style: 'Munich Helles', abv: '4.5', notes: 'Clean, crisp, grainy-sweet with floral overtones.', color: '#f7c948', fill: 0.92 },
  { name: 'Dream Blonde', style: 'Blonde Ale', abv: '4.5', notes: 'White peach, coconut and pineapple. Dangerously crushable.', color: '#f9dc7a', fill: 0.8 },
]

export const cocktails = [
  { name: 'Singapore Sling', price: '18' },
  { name: 'Espresso Martini', price: '14' },
  { name: 'Frozen Margarita', price: '18' },
  { name: 'Mojito', price: '16' },
  { name: 'Piña Colada', price: '14' },
  { name: 'Dark & Stormy', price: '14' },
  { name: 'Aperol Spritz', price: '12' },
  { name: 'Negroni', price: '12' },
]

export const vibes = [
  { type: 'img', image: img('mixed-grill-platter'), caption: 'Platters made for sharing' },
  { type: 'text', big: 'Celebrations', small: 'Birthdays, promotions, “just because”.' },
  { type: 'img', image: img('honey-garlic-pizza'), caption: 'Honey garlic chicken pizza' },
  { type: 'text', big: 'Chill-outs', small: 'Pints, music and a table that’s always buzzing.', tone: 'red' },
  { type: 'img', image: place('shopfront'), caption: '163 Rochor Road, Bugis' },
  { type: 'text', big: 'Hangouts', small: 'Bugis after work. Bugis after dark.', tone: 'lime' },
  { type: 'img', image: place('vinyl'), caption: 'The vinyl corner' },
]

// "The grill picks for you" slot machine — normal à-la-carte menu prices (Jan 2026 menu). Not a combo/deal.
export const slot = {
  starters: [
    { name: 'Truffle Fries', price: 8.5 },
    { name: 'Signature Chicken Wings', price: 10.9 },
    { name: 'Salt & Pepper Squid', price: 10.9 },
    { name: 'Mini Sliders Trio', price: 14.9 },
    { name: 'Nachos Supreme', price: 12.5 },
    { name: 'Stuffed Mushrooms', price: 9.9 },
    { name: 'Cheesy Wedges', price: 10.9 },
    { name: 'Kick-In Shrimp', price: 11.9 },
    { name: 'Burrata Salad', price: 12.9 },
    { name: 'Truffle Mushroom Soup', price: 7.5 },
    { name: 'Spicy Shrimp Skewers', price: 11.9 },
  ],
  mains: [
    { name: 'Grass-Fed Tenderloin', price: 39.9 },
    { name: 'Grass-Fed Ribeye', price: 34.9 },
    { name: 'Sirloin Steak', price: 23.9 },
    { name: 'BBQ Pork Ribs (Half)', price: 22.8 },
    { name: 'Herb-Crusted Salmon', price: 22.9 },
    { name: 'Raclette Beef Burger', price: 19.9 },
    { name: 'Honey Garlic Chicken Pizza', price: 17.9 },
    { name: 'Classic Carbonara', price: 17.9 },
    { name: 'Seafood Linguini', price: 20.9 },
    { name: 'Lamb Kofte', price: 18.5 },
    { name: 'Herb Pork Chop', price: 17.9 },
    { name: 'Fish & Chips', price: 16.9 },
  ],
  drinks: [
    { name: 'Golden Ale (pint)', price: 13.5 },
    { name: 'What the Helles (pint)', price: 13.5 },
    { name: 'Dream Blonde (pint)', price: 13.5 },
    { name: 'Singapore Sling', price: 18 },
    { name: 'Espresso Martini', price: 14 },
    { name: 'Mojito', price: 16 },
    { name: 'Frozen Margarita', price: 18 },
    { name: 'Aperol Spritz', price: 12 },
    { name: 'Virgin Mojito', price: 8.5 },
    { name: 'Mango Madness', price: 6.5 },
    { name: 'Lychee Tea', price: 7.5 },
  ],
}
