'use client';
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const revenueData = [
  { giorno: 'Lun', ricavi: 892, ordini: 31 },
  { giorno: 'Mar', ricavi: 1140, ordini: 42 },
  { giorno: 'Mer', ricavi: 780, ordini: 28 },
  { giorno: 'Gio', ricavi: 1320, ordini: 49 },
  { giorno: 'Ven', ricavi: 1680, ordini: 63 },
  { giorno: 'Sab', ricavi: 2240, ordini: 84 },
  { giorno: 'Dom', ricavi: 1284, ordini: 47 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-modal px-4 py-3 min-w-[140px]">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={`tt-${i}`} className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            {entry.name === 'ricavi' ? 'Ricavi' : 'Ordini'}
          </span>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {entry.name === 'ricavi' ? `€ ${entry.value.toLocaleString('it-IT')}` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Ricavi ultimi 7 giorni</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ricavi e volume ordini per giorno</p>
        </div>
        <span className="text-xs bg-secondary text-primary px-3 py-1 rounded-full font-semibold border border-orange-200">
          Questa settimana
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="giorno"
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `€${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="ricavi"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#gradRicavi)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--primary)', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
