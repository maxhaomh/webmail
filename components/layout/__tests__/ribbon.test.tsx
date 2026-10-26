import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ribbon } from '../ribbon';
import { useSettingsStore } from '@/stores/settings-store';
import { usePolicyStore } from '@/stores/policy-store';
import { DEFAULT_POLICY } from '@/lib/admin/types';

vi.mock('next-intl', () => ({
  useTranslations: (ns?: string) => (key: string) => ns ? `${ns}.${key}` : key,
}));
const actions = () => ({ onCompose: vi.fn(), onReply: vi.fn(), onReplyAll: vi.fn(), onForward: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn(), onRefresh: vi.fn(), canRespond: false, canOrganize: false });
beforeEach(() => {
  useSettingsStore.setState({ mailLayout: 'split' });
  usePolicyStore.setState({ policy: { ...DEFAULT_POLICY } });
});
describe('Ribbon', () => {
  it('disables message actions without a target but keeps compose and sync available', () => {
    const props = actions();
    render(<Ribbon {...props} />);
    expect(screen.getByRole('button', { name: 'email_viewer.reply' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'email_viewer.delete' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'sidebar.compose' }));
    fireEvent.click(screen.getByRole('tab', { name: 'ribbon.send_receive' }));
    fireEvent.click(screen.getByRole('button', { name: 'ribbon.sync' }));
    expect(props.onCompose).toHaveBeenCalledOnce();
    expect(props.onRefresh).toHaveBeenCalledOnce();
  });
  it('delegates enabled message commands to the existing handlers', () => {
    const props = actions();
    render(<Ribbon {...props} canRespond canOrganize />);
    fireEvent.click(screen.getByRole('button', { name: 'email_viewer.delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'email_viewer.reply_all' }));
    expect(props.onDelete).toHaveBeenCalledOnce();
    expect(props.onReplyAll).toHaveBeenCalledOnce();
  });
  it('supports keyboard tab switching, reading pane changes and collapsing', () => {
    render(<Ribbon {...actions()} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'ribbon.home' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'ribbon.help' })).toHaveFocus();
    fireEvent.click(screen.getByRole('tab', { name: 'ribbon.view' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'ribbon.reading_pane' }), { target: { value: 'horizontal' } });
    expect(useSettingsStore.getState().mailLayout).toBe('horizontal');
    fireEvent.click(screen.getByRole('button', { name: 'ribbon.collapse' }));
    expect(screen.queryByRole('tabpanel')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ribbon.expand' }));
    expect(screen.getByRole('tabpanel')).toBeVisible();
  });
  it('moves selected mail through the folder menu and marks mail read', () => {
    const move = vi.fn();
    const read = vi.fn();
    render(<Ribbon {...actions()} canOrganize onMove={move} moveTargets={[{ id: 'work', name: 'Work' }]} onMarkRead={read} />);
    fireEvent.click(screen.getByRole('button', { name: 'ribbon.move_to' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Work' }));
    expect(move).toHaveBeenCalledWith('work');
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ribbon.read_unread' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'email_viewer.mark_read' }));
    expect(read).toHaveBeenCalledOnce();
  });
  it('keeps all composer mounts alive while changing contextual tabs', () => {
    const format = vi.fn();
    const insert = vi.fn();
    const options = vi.fn();
    const view = render(<Ribbon {...actions()} composing onFormatTarget={format} onInsertTarget={insert} onOptionsTarget={options} />);
    const formatHost = format.mock.calls[0][0];
    expect(formatHost).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'ribbon.insert' }));
    expect(insert.mock.calls[0][0]).toBeVisible();
    expect(formatHost).not.toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'ribbon.format' }));
    expect(formatHost).toBeVisible();
    view.unmount();
    expect(format.mock.calls.at(-1)?.[0]).toBeNull();
    expect(insert.mock.calls.at(-1)?.[0]).toBeNull();
    expect(options.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it('closes a dropdown with Escape without invoking mail shortcuts', () => {
    const shortcut = vi.fn();
    window.addEventListener('keydown', shortcut);
    try {
      render(<Ribbon {...actions()} canOrganize onMove={vi.fn()} moveTargets={[{ id: 'work', name: 'Work' }]} />);
      fireEvent.click(screen.getByRole('button', { name: 'ribbon.move_to' }));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
      expect(shortcut).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'ribbon.move_to' })).toHaveFocus();
    } finally { window.removeEventListener('keydown', shortcut); }
  });

});
