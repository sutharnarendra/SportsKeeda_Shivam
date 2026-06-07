import { ShieldAlert, Info, Truck } from 'lucide-react';
import './Policy.css';
export default function Policy() {
    return (
        <main className="policy-page">
            <div className="policy-container">

                {/* Page Header */}
                <div className="policy-header animate-fade-up stagger-1">
                    <h1 className="policy-title">Terms & Store Policies</h1>
                    <p className="policy-subtitle">Please read through our terms, shipping parameters, and custom return policies before placing an order.</p>
                </div>
                {/* Policy Grid Sections */}
                <div className="policy-grid animate-fade-up stagger-2">

                    {/* Section 1: Refund Policy (No Return) */}
                    <section className="policy-card policy-card--warning">
                        <div className="policy-card-header">
                            <ShieldAlert className="policy-icon" size={24} />
                            <h2>No-Return & Exchange Policy</h2>
                        </div>
                        <div className="policy-card-body">
                            <p>
                                At Yatra X, every piece of athletic gear is handcrafted, hand-polished, and custom laser-engraved to your specifications. Due to the highly customized, artisan nature of our products, <strong>we operate on a strict No-Return and No-Refund Policy.</strong>
                            </p>
                            <p>
                                <strong>Exchanges for Damage:</strong> If your equipment arrives damaged due to postal transit, we will immediately send a replacement. You must email our team with photographic proof of the packaging and item damage within <strong>24 hours of delivery</strong> to qualify for a free exchange.
                            </p>
                        </div>
                    </section>
                    {/* Section 2: Shipping & Tax Policy */}
                    <section className="policy-card">
                        <div className="policy-card-header">
                            <Truck className="policy-icon" size={24} />
                            <h2>Shipping & Tax Calculations</h2>
                        </div>
                        <div className="policy-card-body">
                            <ul>
                                <li><strong>Free Shipping in India:</strong> We provide complimentary insured shipping across India for all orders above ₹3,000. Orders below ₹3,000 incur a flat ₹250 handling charge.</li>
                                <li><strong>Goods & Services Tax (GST):</strong> In compliance with federal tax regulations, a standard 18% GST is calculated and displayed at checkout.</li>
                                <li><strong>Tracking:</strong> Once your order is packaged, you will receive a tracking link via email to follow your package in transit.</li>
                            </ul>
                        </div>
                    </section>
                    {/* Section 3: Natural Materials Disclaimer */}
                    <section className="policy-card">
                        <div className="policy-card-header">
                            <Info className="policy-icon" size={24} />
                            <h2>Natural Wood Variation Disclaimer</h2>
                        </div>
                        <div className="policy-card-body">
                            <p>
                                Wood is a living, organic material. Each pair of parallettes has unique grain configurations, color depths, and natural knots. These variations are not manufacturing defects but proof of authentic wood craftsmanship.
                            </p>
                            <p>
                                Grip textures and surface grains will mature over time with sweat, oils, and hand friction, creating a custom grip profile unique to your training sessions.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}