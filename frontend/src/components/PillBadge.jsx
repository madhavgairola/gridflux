import React from 'react';

/**
 * Modern pill badge styled after clean craft design systems.
 * Features a rounded-full pill outline, soft translucent tint,
 * and a leading colored icon container.
 */
export default function PillBadge({
  icon: Icon,
  label,
  variant = 'emerald', // 'emerald' | 'orange' | 'amber' | 'cyan' | 'indigo' | 'blue' | 'neutral'
  className = '',
  size = 'md', // 'sm' | 'md'
}) {
  const variantStyles = {
    emerald: {
      pill: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:border-emerald-500/70',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
    },
    orange: {
      pill: 'border-orange-500/50 bg-orange-950/40 text-orange-300 hover:border-orange-500/70',
      iconBg: 'bg-orange-500/20 text-orange-400',
    },
    amber: {
      pill: 'border-amber-500/50 bg-amber-950/40 text-amber-300 hover:border-amber-500/70',
      iconBg: 'bg-amber-500/20 text-amber-400',
    },
    cyan: {
      pill: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300 hover:border-cyan-500/70',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
    },
    indigo: {
      pill: 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300 hover:border-indigo-500/70',
      iconBg: 'bg-indigo-500/20 text-indigo-400',
    },
    blue: {
      pill: 'border-sky-500/50 bg-sky-950/40 text-sky-300 hover:border-sky-500/70',
      iconBg: 'bg-sky-500/20 text-sky-400',
    },
    neutral: {
      pill: 'border-zinc-700/70 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600',
      iconBg: 'bg-zinc-800 text-zinc-400',
    },
  };

  const style = variantStyles[variant] || variantStyles.emerald;
  const isSm = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors select-none ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
      } font-medium tracking-tight ${style.pill} ${className}`}
    >
      {Icon && (
        <span
          className={`${
            isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } rounded-full flex items-center justify-center shrink-0 ${style.iconBg}`}
        >
          <Icon className={isSm ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
        </span>
      )}
      <span className="leading-tight">{label}</span>
    </span>
  );
}
