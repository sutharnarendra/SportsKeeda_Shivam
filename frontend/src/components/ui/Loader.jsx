import { useState, useEffect } from 'react';
import './Loader.css';

export default function Loader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Trigger fade-out after reaching 100%
          setTimeout(() => setFadeOut(true), 300);
          // Notify parent after fade animation completes
          setTimeout(() => onComplete?.(), 1100);
          return 100;
        }
        // Accelerate as it progresses
        const increment = prev < 60 ? 3 : prev < 85 ? 2 : 1;
        return Math.min(prev + increment, 100);
      });
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`loader-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <div className="loader-brand">
        <img
          src="/images/bicep.png"
          alt="Yatra X Logo"
          className="loader-logo-img"
        />
        <h1 className="loader-brand-name">Yatra X</h1>
        <p className="loader-tagline">Crafted for Performance</p>
        <div className="loader-progress-track">
          <div
            className="loader-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
