import React from 'react';

/**
 * Official FaceTrack (DTR) Brand Mark
 * Designed with kaankiziltug/logo-design-skill
 * Monogram F + Biometric Optical Scan Beam & Focal Pulse Node
 */
export default function BrandLogo({ className = 'w-6 h-6', color = 'currentColor' }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FaceTrack DTR Logo"
    >
      {/* Vertical Pillar Stem */}
      <rect x="52" y="44" width="34" height="168" rx="17" />

      {/* Top Scanner Arm with Downward Focus Terminal */}
      <path d="M72 44 L190 44 C199.94 44 208 52.06 208 62 L208 84 C208 89.52 203.52 94 198 94 C192.48 94 188 89.52 188 84 L188 64 C188 64 186 64 184 64 L72 64 C66.48 64 62 59.52 62 54 C62 48.48 66.48 44 72 44 Z" />

      {/* Middle Biometric Scan Beam */}
      <rect x="72" y="112" width="88" height="32" rx="16" />

      {/* Dynamic Biometric Pulse Focal Node with True Negative-Space Core */}
      <path
        fillRule="evenodd"
        d="M192 112 A16 16 0 1 1 191.9 112 Z M192 122 A6 6 0 1 0 192.1 122 Z"
      />
    </svg>
  );
}
