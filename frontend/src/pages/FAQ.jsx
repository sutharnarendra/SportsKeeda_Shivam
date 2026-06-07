import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import './FAQ.css';

const FAQ_ITEMS = [
    {
        question: "What types of wood are used in Yatra X parallettes?",
        answer: "We offer our equipment in premium hardwoods including Sheesham (Indian Rosewood), Teak, Mango, and Walnut. Each wood has distinct grain patterns and weights, but all offer outstanding structural integrity and longevity."
    },
    {
        question: "What is the grip diameter of the bars?",
        answer: "Our standard grip diameter is 38mm. This is the optimal thickness recommended by Olympic gymnastics and professional calisthenics athletes to reduce wrist strain while maintaining maximum grip control."
    },
    {
        question: "How do I maintain and clean my wooden parallettes?",
        answer: "Keep the wood dry. Wipe down the grip bars with a dry microfiber cloth after use to clean sweat. Every few months, you can re-apply a thin coat of organic linseed oil to preserve the wood's texture and natural moisture barrier."
    },
    {
        question: "Can these parallettes be used outdoors?",
        answer: "Yes, you can train outdoors on grass or hard surfaces. However, because wood is a natural porous material, you should not leave them exposed to moisture, rain, or direct heat for extended periods. Always store them indoors."
    },
    {
        question: "What is the return and exchange policy?",
        answer: "Because each pair of parallettes is custom hand-carved and custom laser-engraved, we operate on a strict No-Return Policy. However, in the rare event that your product arrives with shipping damage, contact support within 24 hours of delivery for an instant replacement exchange."
    },
    {
        question: "How long does shipping take?",
        answer: "Domestic orders within India ship free and usually take 3 to 7 business days depending on your location. Standard tracking details will be emailed to you immediately after the order is processed."
    }
];

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <main className="faq-page">
            <div className="faq-container">

                {/* Header Block */}
                <div className="faq-header animate-fade-up stagger-1">
                    <h1 className="faq-title">
                        <HelpCircle size={32} style={{ color: 'var(--color-wood-dark)', marginRight: '12px', verticalAlign: 'middle' }} />
                        Frequently Asked Questions
                    </h1>
                    <p className="faq-subtitle">Everything you need to know about our handcrafted gymnastics and calisthenics gear.</p>
                </div>

                {/* Accordion List */}
                <div className="faq-list animate-fade-up stagger-2">
                    {FAQ_ITEMS.map((item, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div key={idx} className={`faq-card ${isOpen ? 'faq-card--open' : ''}`}>
                                <button className="faq-question-btn" onClick={() => toggleAccordion(idx)}>
                                    <span>{item.question}</span>
                                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                                <div className={`faq-answer-wrapper ${isOpen ? 'faq-answer-wrapper--open' : ''}`}>
                                    <p className="faq-answer">{item.answer}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}