'use client';

import React from 'react';

export function DynamicVideoBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 opacity-30 bg-gradient-to-br from-indigo-700 via-sky-500 to-cyan-500" />
  );
}
