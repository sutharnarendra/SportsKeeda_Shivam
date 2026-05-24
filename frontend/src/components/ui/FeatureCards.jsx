import { Ruler, Paintbrush, Pen, Truck, TreePine, Shield } from 'lucide-react';
import './FeatureCard.css';

const FEATURES = [
  {
    icon: Ruler,
    title: 'Perfect Size',
    desc: '30cm × 15cm × 12cm — ergonomic grip height for all exercises',
  },
  {
    icon: Paintbrush,
    title: 'Customization',
    desc: 'Choose from Sheesham, Teak, or Mango wood finishes',
  },
  {
    icon: Pen,
    title: 'Laser Engraving',
    desc: 'Add your name, logo, or brand — precision laser etched',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    desc: 'Free shipping across India — 3–5 business days',
  },
  {
    icon: TreePine,
    title: 'Premium Wood',
    desc: 'Hand-selected Indian hardwood, naturally finished',
  },
  {
    icon: Shield,
    title: '2 Year Warranty',
    desc: 'Built to last — 150kg load tested & certified',
  },
];

export default function FeatureCards({ visible = true }) {
  if (!visible) return null;

  return (
    <div className="feature-cards-container">
      {FEATURES.map((feature, index) => (
        <div
          key={index}
          className="feature-card"
          id={`feature-card-${index}`}
          style={{ animationDelay: `${index * 0.12}s` }}
        >
          <div className="feature-card-icon">
            <feature.icon size={20} />
          </div>
          <h4 className="feature-card-title">{feature.title}</h4>
          <p className="feature-card-desc">{feature.desc}</p>
        </div>
      ))}
    </div>
  );
}
