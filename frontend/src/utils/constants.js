export const FEATURED_PRODUCTS = [
  {
    id: 1,
    name: 'Pro Parallettes',
    description: 'Our flagship model — precision crafted for serious calisthenics athletes. Laser-engraved with your logo.',
    price: 3499,
    originalPrice: 4199,
    rating: 4.8,
    image: null,      // placeholder — admin will upload
    video: null,      // placeholder — admin will upload product video
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 3499, originalPrice: 4199, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 4299, originalPrice: 4999, swatchColor: '#8B6914' },
      { woodType: 'Mango', price: 2999, originalPrice: 3599, swatchColor: '#C4A882' },
    ],
  },
  {
    id: 2,
    name: 'Classic Parallettes',
    description: 'Perfect for beginners and home gyms. Lightweight yet rock solid with anti-slip rubber feet.',
    price: 2799,
    originalPrice: 3299,
    rating: 4.6,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Mango', price: 2799, originalPrice: 3299, swatchColor: '#C4A882' },
      { woodType: 'Sheesham', price: 3299, originalPrice: 3899, swatchColor: '#5C3D2E' },
    ],
  },
  {
    id: 3,
    name: 'Elite Parallettes',
    description: 'Premium teak with hand-rubbed oil finish. Competition grade with 150kg load capacity.',
    price: 4999,
    originalPrice: 5999,
    rating: 4.9,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Teak', price: 4999, originalPrice: 5999, swatchColor: '#8B6914' },
      { woodType: 'Walnut', price: 5499, originalPrice: 6499, swatchColor: '#3E2723' },
    ],
  },
  {
    id: 4,
    name: 'Mini Parallettes',
    description: 'Compact travel-friendly design. Fits in your backpack — train anywhere, anytime.',
    price: 1999,
    originalPrice: null,
    rating: 4.5,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Mango', price: 1999, originalPrice: null, swatchColor: '#C4A882' },
      { woodType: 'Pine', price: 1699, originalPrice: null, swatchColor: '#DEC099' },
    ],
  },
  {
    id: 5,
    name: 'Gymnast Pro',
    description: 'Extra-wide grip bars for advanced moves like planche, L-sit, and handstand presses.',
    price: 3999,
    originalPrice: 4499,
    rating: 4.7,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Sheesham', price: 3999, originalPrice: 4499, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 4799, originalPrice: 5299, swatchColor: '#8B6914' },
    ],
  },
  {
    id: 6,
    name: 'Studio Set',
    description: 'Gym & studio pack — 2 pairs with custom branding. Bulk pricing for fitness studios.',
    price: 6499,
    originalPrice: 7999,
    rating: 4.8,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 6499, originalPrice: 7999, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 7999, originalPrice: 9499, swatchColor: '#8B6914' },
      { woodType: 'Mango', price: 5499, originalPrice: 6999, swatchColor: '#C4A882' },
    ],
  },
];

export const SIMILAR_PRODUCTS = [
  {
    id: 101,
    name: 'Push-Up Bars',
    description: 'Ergonomic wooden push-up bars with angled grip. Same premium craftsmanship.',
    price: 1499,
    originalPrice: 1799,
    rating: 4.4,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Mango', price: 1499, originalPrice: 1799, swatchColor: '#C4A882' },
      { woodType: 'Sheesham', price: 1899, originalPrice: 2199, swatchColor: '#5C3D2E' },
    ],
  },
  {
    id: 102,
    name: 'Yoga Blocks (Pair)',
    description: 'Sustainably sourced cork & wood yoga blocks. Naturally antimicrobial.',
    price: 999,
    originalPrice: null,
    rating: 4.3,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Cork', price: 999, originalPrice: null, swatchColor: '#D2B48C' },
    ],
  },
  {
    id: 103,
    name: 'Balance Board',
    description: 'Handcrafted wooden balance board for core stability and rehab exercises.',
    price: 2499,
    originalPrice: 2999,
    rating: 4.6,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 2499, originalPrice: 2999, swatchColor: '#5C3D2E' },
      { woodType: 'Teak', price: 2999, originalPrice: 3499, swatchColor: '#8B6914' },
    ],
  },
  {
    id: 104,
    name: 'Gymnastics Rings',
    description: 'Premium wooden gymnastics rings with adjustable nylon straps. Competition grade.',
    price: 2299,
    originalPrice: 2799,
    rating: 4.7,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Birch', price: 2299, originalPrice: 2799, swatchColor: '#F5DEB3' },
    ],
  },
  {
    id: 105,
    name: 'Ab Roller Wheel',
    description: 'Sheesham wood ab roller with dual bearings for smooth, silent rolls.',
    price: 1299,
    originalPrice: 1599,
    rating: 4.5,
    image: null,
    video: null,
    onSale: true,
    variants: [
      { woodType: 'Sheesham', price: 1299, originalPrice: 1599, swatchColor: '#5C3D2E' },
    ],
  },
  {
    id: 106,
    name: 'Handstand Canes',
    description: 'Tall standing canes for circus handbalancing. Adjustable height, solid teak.',
    price: 5999,
    originalPrice: 6999,
    rating: 4.9,
    image: null,
    video: null,
    onSale: false,
    variants: [
      { woodType: 'Teak', price: 5999, originalPrice: 6999, swatchColor: '#8B6914' },
      { woodType: 'Sheesham', price: 5499, originalPrice: 6499, swatchColor: '#5C3D2E' },
    ],
  },
];

export const ALL_PRODUCTS = [...FEATURED_PRODUCTS, ...SIMILAR_PRODUCTS];

export function getProductById(id) {
  const numId = parseInt(id, 10);
  return ALL_PRODUCTS.find(p => p.id === numId) || null;
}
