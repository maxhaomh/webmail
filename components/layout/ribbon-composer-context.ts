"use client";

import { createContext } from 'react';

/** Only the visible desktop ribbon supplies these mounts. Other composers keep local tools. */
export const RibbonComposerContext = createContext<{
  formatTarget: HTMLDivElement | null;
  actionTarget: HTMLDivElement | null;
  insertTarget: HTMLDivElement | null;
  optionsTarget: HTMLDivElement | null;
} | null>(null);
