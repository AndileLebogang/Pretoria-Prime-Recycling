// ────────────────────────────────────────────────────────────
// EDIT THIS FILE: your business details live here.
// ────────────────────────────────────────────────────────────
export const site = {
  name: 'Pretoria Prime Recycling',
  area: 'Silver Lakes',
  city: 'Pretoria',
  slogan: "Silver Lakes' door-to-door recyclable collection service",
  collectionWindow: '07:00 - 09:00',
  whatsapp: '270000000000',            // country code + number, no + or spaces
  phoneDisplay: '+27 00 000 0000',
  phoneLink: '+270000000000',
  email: 'info@pretoriaprimerecycling.co.za',
  bank: {                               // shown on the Payments screen for EFT
    bankName: 'Your bank',
    accountName: 'Pretoria Prime Recycling',
    accountNumber: '0000000000',
    branchCode: '000000',
    accountType: 'Business cheque',
  },
};

export const whatsappLink = (text = 'Hi Pretoria Prime Recycling,') =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

export const materials = [
  'Paper & cardboard',
  'Plastic bottles & containers',
  'Glass',
  'Metal & cans',
];

// ISO weekday: 1 = Monday ... 7 = Sunday
export const days = [
  { n: 1, short: 'M', long: 'Monday' },
  { n: 2, short: 'T', long: 'Tuesday' },
  { n: 3, short: 'W', long: 'Wednesday' },
  { n: 4, short: 'T', long: 'Thursday' },
  { n: 5, short: 'F', long: 'Friday' },
  { n: 6, short: 'S', long: 'Saturday' },
  { n: 7, short: 'S', long: 'Sunday' },
];

export const binGuide = [
  { title: 'Paper & cardboard', yes: 'Newspapers, magazines, office paper, flattened boxes', no: 'Greasy pizza boxes, tissues, wax-coated cartons' },
  { title: 'Plastic bottles & containers', yes: 'Rinsed bottles, milk and juice containers, yoghurt tubs, shampoo bottles', no: 'Polystyrene, chip packets, cling wrap' },
  { title: 'Glass', yes: 'Bottles and jars, rinsed, lids off', no: 'Mirrors, light bulbs, drinking glasses, ceramics' },
  { title: 'Metal & cans', yes: 'Food and drink cans, clean foil, aluminium trays', no: 'Paint tins, aerosols that are not empty' },
];

export const faqs = [
  { q: 'When is my collection?', a: 'On the day you chose under Schedule, between 07:00 and 09:00. Please put your recyclables out before 07:00.' },
  { q: 'What if you miss my pickup?', a: 'Message us on WhatsApp and we will arrange a make-up collection.' },
  { q: 'How do I pay?', a: 'Pay your monthly plan by EFT using your reference on the Payments screen. Your payment appears in your billing history once we receive it.' },
  { q: 'How do I pause or cancel?', a: 'Tap Manage subscription on the Payments screen and send us a message.' },
];
