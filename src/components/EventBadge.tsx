import React from 'react';
import { cn } from '../lib/utils';
import { EventCategory } from '../types';

interface EventBadgeProps {
  category: EventCategory;
  className?: string;
}

export function EventBadge({ category, className }: EventBadgeProps) {
  const styles = {
    culto_normal: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    culto_especial: 'bg-amber-100 text-amber-800 border-amber-200',
    reuniao: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  const labels = {
    culto_normal: 'Culto Normal',
    culto_especial: 'Culto Especial',
    reuniao: 'Reunião',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        styles[category],
        className
      )}
    >
      {labels[category]}
    </span>
  );
}
