import React from 'react';
import { InstallAppButton } from './InstallAppButton';

interface InstallPamborinaAppProps {
  className?: string;
  variant?: 'primary' | 'compact' | 'footer';
}

/**
 * Unified alias for InstallAppButton.
 * Re-routes to canonical single-source Pamborina PWA install component.
 */
export const InstallPamborinaApp: React.FC<InstallPamborinaAppProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const mappedVariant = variant === 'footer' ? 'footer' : 'default';
  return <InstallAppButton className={className} variant={mappedVariant} />;
};

export default InstallPamborinaApp;
