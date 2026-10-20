import React from 'react';
import type { PriorityType } from '../../types/reminder';
import { getPriorityConfig } from '../../utils/priority';

interface PriorityBadgeProps {
  priority: PriorityType;
  completed?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, completed = false, size = 'sm' }) => {
  const config = getPriorityConfig(priority, completed);

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.badgeBg} ${config.badgeText} ${sizeClasses}`}
      style={{ borderColor: `${config.colorHex}40` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: config.colorHex }}
      />
      <span>{completed ? 'Completed' : config.label}</span>
    </span>
  );
};
