'use client';
import React from 'react';
import versionData from '@/version.json';

interface AppVersionProps {
  className?: string;
}

export default function AppVersion({ className = '' }: AppVersionProps) {
  const date = new Date(versionData.buildDate);
  const formattedDate = date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className={`flex flex-col text-[10px] text-muted-foreground opacity-60 hover:opacity-100 transition-opacity ${className}`}
    >
      <span className="font-bold">v{versionData.version}</span>
      <span>Build: {formattedDate}</span>
    </div>
  );
}
