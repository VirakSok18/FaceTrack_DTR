import React, { useState } from 'react';
import { getFileUrl } from '../lib/api';

/**
 * Extract clean 1-2 letter initials from a person's name
 */
export function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Robust Avatar Component with graceful fallback to monochrome initials
 */
export default function StaffAvatar({ photo, name, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const resolvedUrl = getFileUrl(photo) || (typeof photo === 'string' && photo.trim() ? photo : null);

  const sizeClasses = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-11 h-11 text-xs',
    lg: 'w-20 h-20 text-lg',
    xl: 'w-36 h-36 text-3xl font-black',
    full: 'w-full h-full text-3xl font-black',
  }[size] || 'w-11 h-11 text-xs';

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name || 'Staff'}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-2xl object-cover border border-neutral-200 shadow-sm transition-transform duration-300 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-2xl bg-neutral-950 text-white font-black flex items-center justify-center border border-neutral-800 shadow-sm select-none tracking-wider ${className}`}
    >
      {initials}
    </div>
  );
}
