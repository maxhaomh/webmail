"use client";

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Archive, ChevronDown, ChevronUp, Forward, Mail, MailOpen, RefreshCw, Reply, ReplyAll, Star, Trash2, Folder, ShieldAlert, MoreHorizontal, Menu, Maximize2, Settings, LayoutList, Type, HelpCircle, Pin, Tag } from '@/components/icons';
import { RibbonCommand as Command, RibbonMenu, RibbonMenuItem, RibbonSeparator } from './ribbon-controls';
import { TagPicker } from '@/components/email/tag-picker';
import { Button } from '@/components/ui/button';
import { useSettingsStore, type Density, type FontSize, type MailLayout } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { usePolicyStore } from '@/stores/policy-store';
import { cn } from '@/lib/utils';

type Tab = 'home' | 'send_receive' | 'view' | 'help' | 'message' | 'insert' | 'format' | 'options';
interface RibbonProps {
  onCompose: () => void; onReply: () => void; onReplyAll: () => void; onForward: () => void;
  onArchive?: () => void; onDelete: () => void; onRefresh: () => void;
  onMarkRead?: () => void; onMarkUnread?: () => void; onToggleStar?: () => void;
  onPin?: () => void; pinned?: boolean; starred?: boolean;
  selectedTags?: string[]; partialTags?: string[]; onToggleTag?: (id: string) => void;
  reportAsNotSpam?: boolean;
  onReport?: () => void; onSelectAll?: () => void; onFullscreen?: () => void; onHelp?: () => void;
  onMove?: (id: string) => void; moveTargets?: { id: string; name: string }[];
  canRespond: boolean; canOrganize: boolean; composing?: boolean;
  onFormatTarget?: (node: HTMLDivElement | null) => void;
  onActionTarget?: (node: HTMLDivElement | null) => void;
  onInsertTarget?: (node: HTMLDivElement | null) => void;
  onOptionsTarget?: (node: HTMLDivElement | null) => void;
}

/** Simplified ribbon: a tab row and one 40px command strip, with contextual compose tabs. */
export function Ribbon(props: RibbonProps) {
  const t = useTranslations();
  const r = useTranslations('ribbon');
  const [tab, setTab] = useState<Tab>(props.composing ? 'message' : 'home');
  const [collapsed, setCollapsed] = useState(false);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const settings = useSettingsStore();
  const { isSettingHidden, isSettingLocked } = usePolicyStore();
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed);
  const toggleSidebar = useUIStore(s => s.toggleSidebarCollapsed);
  const tabNames: Tab[] = props.composing ? ['home', 'view', 'help', 'message', 'insert', 'format', 'options'] : ['home', 'send_receive', 'view', 'help'];
  const selectClass = 'h-7 max-w-36 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40';

  return <section aria-label={r('label')} className="ribbon relative z-30 shrink-0 border-b border-border bg-muted/30 text-foreground">
    <div className="flex h-8 items-center gap-3 px-2">
      <Command icon={Menu} label={r('folder_pane')} onClick={toggleSidebar} iconOnly pressed={!sidebarCollapsed} />
      <div role="tablist" aria-label={r('label')} className="flex h-full min-w-0 gap-4 overflow-x-auto px-1" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.currentTarget.closest('[dir="rtl"]') ? -1 : 1;
        const delta = (event.key === 'ArrowRight' ? 1 : -1) * direction;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabNames.length - 1 : (tabNames.indexOf(tab) + delta + tabNames.length) % tabNames.length;
        setTab(tabNames[next]); tabs.current[next]?.focus();
      }}>
        {tabNames.map((value, index) => <button key={value} ref={node => { tabs.current[index] = node; }} id={`${id}-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`${id}-${value}-panel`}
          tabIndex={tab === value ? 0 : -1} onClick={() => { setTab(value); setCollapsed(false); }}
          className={cn('shrink-0 border-b-2 px-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', tab === value ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{r(value)}</button>)}
      </div>
      <Button variant="ghost" size="icon" aria-label={r(collapsed ? 'expand' : 'collapse')} title={r(collapsed ? 'expand' : 'collapse')} aria-expanded={!collapsed} aria-controls={`${id}-${tab}-panel`} onClick={() => setCollapsed(!collapsed)} className="ms-auto h-6 w-6 shrink-0">
        {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </Button>
    </div>
    {/* Mounts stay alive through tab changes so editor selection and menus keep their state. */}
    {tabNames.map(value => <div key={value} id={`${id}-${value}-panel`} role="tabpanel" aria-labelledby={`${id}-${value}`} hidden={collapsed || tab !== value} tabIndex={0}>
      <div className="ribbon-command-strip mx-1 mb-1 flex h-10 items-center gap-0.5 overflow-x-auto rounded-md border border-border/70 bg-background px-1 shadow-sm">
        {value === 'home' && <>
          <Command primary icon={Mail} label={t('sidebar.compose')} onClick={props.onCompose} />
          <RibbonSeparator />
          <Command icon={Trash2} label={t('email_viewer.delete')} onClick={props.onDelete} disabled={!props.canOrganize} />
          <Command icon={Archive} label={t('email_viewer.archive')} onClick={props.onArchive} disabled={!props.canOrganize || !props.onArchive} />
          <Command icon={ShieldAlert} label={r(props.reportAsNotSpam ? 'not_spam' : 'report')} onClick={props.onReport} disabled={!props.canOrganize || !props.onReport} />
          <RibbonMenu icon={Folder} label={r('move_to')} disabled={!props.canOrganize || !props.onMove || !props.moveTargets?.length}>
            {close => props.moveTargets?.map(target => <RibbonMenuItem key={target.id} onClick={() => { close(); props.onMove?.(target.id); }}>{target.name}</RibbonMenuItem>)}
          </RibbonMenu>
          <RibbonSeparator />
          <Command icon={Reply} label={t('email_viewer.reply')} onClick={props.onReply} disabled={!props.canRespond} />
          <Command icon={ReplyAll} label={t('email_viewer.reply_all')} onClick={props.onReplyAll} disabled={!props.canRespond} />
          <Command icon={Forward} label={t('email_viewer.forward')} onClick={props.onForward} disabled={!props.canRespond} />
          <RibbonSeparator />
          <RibbonMenu icon={MailOpen} label={r('read_unread')} disabled={!props.canOrganize}>
            {close => <>
              <RibbonMenuItem onClick={() => { close(); props.onMarkRead?.(); }} disabled={!props.onMarkRead}>{t('email_viewer.mark_read')}</RibbonMenuItem>
              <RibbonMenuItem onClick={() => { close(); props.onMarkUnread?.(); }} disabled={!props.onMarkUnread}>{t('email_viewer.mark_unread')}</RibbonMenuItem>
            </>}
          </RibbonMenu>
          <Command icon={Star} label={t('email_viewer.star')} onClick={props.onToggleStar} pressed={props.starred} disabled={!props.canRespond || !props.onToggleStar} iconOnly />
          <Command icon={Pin} label={r('pin')} onClick={props.onPin} pressed={props.pinned} disabled={!props.canRespond || !props.onPin} iconOnly />
          <RibbonMenu icon={Tag} label={r('categorize')} disabled={!props.canOrganize || !props.onToggleTag}>
            {() => <TagPicker selectedIds={props.selectedTags ?? []} partialIds={props.partialTags ?? []} onToggle={id => props.onToggleTag?.(id)} />}
          </RibbonMenu>
          <Command icon={RefreshCw} label={r('sync')} onClick={props.onRefresh} iconOnly />
          <RibbonMenu icon={MoreHorizontal} label={r('more')}>
            {close => <>
              <RibbonMenuItem onClick={() => { close(); props.onSelectAll?.(); }} disabled={!props.onSelectAll}>{r('select_all')}</RibbonMenuItem>
              <RibbonMenuItem onClick={() => { close(); props.onHelp?.(); }} disabled={!props.onHelp}>{r('shortcuts')}</RibbonMenuItem>
            </>}
          </RibbonMenu>
        </>}
        {value === 'send_receive' && <Command icon={RefreshCw} label={r('sync')} onClick={props.onRefresh} />}
        {value === 'view' && <>
          {!isSettingHidden('mailLayout') && <label className="flex shrink-0 items-center gap-1.5 px-2 text-xs"><Settings className="h-4 w-4" />{r('reading_pane')}
            <select aria-label={r('reading_pane')} className={selectClass} value={settings.mailLayout} disabled={isSettingLocked('mailLayout')} onChange={event => settings.updateSetting('mailLayout', event.target.value as MailLayout)}>
              {(['split', 'horizontal', 'focus'] as const).map(pane => <option key={pane} value={pane}>{t(`settings.email_behavior.mail_layout.${pane}`)}</option>)}
            </select>
          </label>}
          <RibbonSeparator />
          <Command icon={Menu} label={r('folder_pane')} onClick={toggleSidebar} pressed={!sidebarCollapsed} />
          {!isSettingHidden('density') && <label className="flex shrink-0 items-center gap-1.5 px-2 text-xs"><LayoutList className="h-4 w-4" />{r('density')}
            <select aria-label={r('density')} className={selectClass} value={settings.density} disabled={isSettingLocked('density')} onChange={event => settings.updateSetting('density', event.target.value as Density)}>
              {(['extra-compact', 'compact', 'regular', 'comfortable'] as const).map(density => <option key={density} value={density}>{r(density)}</option>)}
            </select>
          </label>}
          {!isSettingHidden('fontSize') && <label className="flex shrink-0 items-center gap-1.5 px-2 text-xs"><Type className="h-4 w-4" />{r('zoom')}
            <select aria-label={r('zoom')} className={selectClass} value={settings.fontSize} disabled={isSettingLocked('fontSize')} onChange={event => settings.updateSetting('fontSize', event.target.value as FontSize)}>
              <option value="small">14 px</option><option value="medium">16 px</option><option value="large">18 px</option>
            </select>
          </label>}
          <RibbonMenu icon={Mail} label={r('messages')}>
            {() => <>
              {!isSettingHidden('disableThreading') && <RibbonMenuItem checked={!settings.disableThreading} disabled={isSettingLocked('disableThreading')} onClick={() => settings.updateSetting('disableThreading', !settings.disableThreading)}>{r('conversations')}</RibbonMenuItem>}
              {!isSettingHidden('showPreview') && <RibbonMenuItem checked={settings.showPreview} disabled={isSettingLocked('showPreview')} onClick={() => settings.updateSetting('showPreview', !settings.showPreview)}>{r('preview')}</RibbonMenuItem>}
            </>}
          </RibbonMenu>
          <RibbonSeparator />
          <Command icon={RefreshCw} label={r('sync')} onClick={props.onRefresh} />
          {!props.composing && <Command icon={Maximize2} label={r('immersive_reader')} onClick={props.onFullscreen} disabled={!props.canRespond || !props.onFullscreen} />}
        </>}
        {value === 'help' && <Command icon={HelpCircle} label={r('shortcuts')} onClick={props.onHelp} disabled={!props.onHelp} />}
        {value === 'message' && <div ref={props.onActionTarget} className="ribbon-composer-actions flex min-w-max items-center gap-0.5" />}
        {value === 'insert' && <div ref={props.onInsertTarget} className="ribbon-composer-actions flex min-w-max items-center gap-0.5" />}
        {value === 'options' && <div ref={props.onOptionsTarget} className="ribbon-composer-actions flex min-w-max items-center gap-0.5" />}
        {value === 'format' && <div ref={props.onFormatTarget} className="ribbon-format-host min-w-max" />}
      </div>
    </div>)}
  </section>;
}
