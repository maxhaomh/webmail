"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, type AppIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useMenuNavigation } from '@/hooks/use-menu-navigation';
import { cn } from '@/lib/utils';

export function RibbonCommand({ icon: Icon, label, onClick, disabled, primary, pressed, iconOnly }: {
  icon: AppIcon; label: string; onClick?: () => void; disabled?: boolean; primary?: boolean; pressed?: boolean; iconOnly?: boolean;
}) {
  return <Button type="button" variant={primary ? 'default' : 'ghost'} onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={pressed}
    className={cn('h-8 shrink-0 gap-1.5 rounded px-2 text-xs font-normal shadow-none', pressed && 'bg-accent text-accent-foreground', primary && 'px-3 font-medium', iconOnly && 'w-8 px-0')}>
    <Icon className="h-4 w-4 shrink-0" />{!iconOnly && <span className="whitespace-nowrap">{label}</span>}
  </Button>;
}

/** Portals keep dropdowns outside the slim, horizontally scrollable command strip. */
export function RibbonMenu({ icon: Icon, label, disabled, children }: {
  icon: AppIcon; label: string; disabled?: boolean; children: (close: () => void) => ReactNode;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => setPosition(null);
  const navigation = useMenuNavigation({ open: !!position, onClose: close, triggerRef: trigger });
  useEffect(() => {
    if (!position) return;
    const panel = trigger.current?.closest('[role=tabpanel]');
    const observer = new MutationObserver(() => { if (panel?.hasAttribute('hidden')) close(); });
    if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !navigation.menuRef.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.current?.focus();
    };
    document.addEventListener('keydown', escape, true);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', close);
    const scroll = (event: Event) => { if (!navigation.menuRef.current?.contains(event.target as Node)) close(); };
    window.addEventListener('scroll', scroll, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', escape, true);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [position, navigation.menuRef]);
  return <>
    <Button ref={trigger} type="button" variant="ghost" disabled={disabled} title={label} aria-label={label} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position ? id : undefined}
      className="h-8 shrink-0 gap-1.5 rounded px-2 text-xs font-normal" onClick={() => {
        if (position) { close(); return; }
        const rect = trigger.current!.getBoundingClientRect();
        setPosition({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)) });
      }}><Icon className="h-4 w-4" /><span className="whitespace-nowrap">{label}</span><ChevronDown className="h-3 w-3 text-muted-foreground" /></Button>
    {position && createPortal(<div id={id} ref={navigation.menuRef} onKeyDown={event => { navigation.onKeyDown(event); event.stopPropagation(); }} role="menu" aria-label={label}
      className="fixed z-[100] w-[17rem] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{ ...position, maxHeight: `calc(100dvh - ${position.top + 8}px)` }}>{children(close)}</div>, document.body)}
  </>;
}

export function RibbonMenuItem({ children, onClick, disabled, checked }: { children: ReactNode; onClick: () => void; disabled?: boolean; checked?: boolean }) {
  return <button type="button" role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={checked} onClick={onClick} disabled={disabled}
    className="flex w-full items-center gap-2 rounded px-3 py-2 text-start text-sm hover:bg-accent focus:bg-accent focus:outline-none disabled:opacity-40">
    {checked !== undefined && <span aria-hidden className="w-4">{checked ? '✓' : ''}</span>}{children}
  </button>;
}

export function RibbonSeparator() { return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />; }
