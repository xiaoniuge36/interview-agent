import React from 'react';

export function ThemeAtmosphere({ context }: { context: 'auth' | 'home' | 'shell' }) {
  return (
    <div className={`theme-atmosphere theme-atmosphere-${context}`} aria-hidden="true">
      <span className="theme-atmosphere-grid" />
      <span className="theme-atmosphere-orbit" />
      <span className="theme-atmosphere-particles" />
    </div>
  );
}
