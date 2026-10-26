import React from 'react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { RichTextEditor } from '../rich-text-editor';

// The ribbon must control this same editor, without duplicating state or tools.
describe('rich text toolbar in the ribbon', () => {
  it('moves the toolbar, formats the selected message, and falls back when the ribbon disappears', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let editor: Editor | undefined;
    const props = { content: '<p>Selected text</p>', onChange: () => {}, onEditorReady: (value: Editor) => { editor = value; } };
    const view = render(<RichTextEditor {...props} toolbarContainer={host} />);
    try {
      await waitFor(() => expect(editor).toBeDefined());
      expect(within(host).getByTestId('rich-text-toolbar')).toBeInTheDocument();
      expect(within(view.container).queryByTestId('rich-text-toolbar')).toBeNull();
      act(() => { editor!.commands.selectAll(); });
      fireEvent.click(within(host).getByRole('button', { name: 'bold' }));
      expect(editor!.getHTML()).toContain('<strong>Selected text</strong>');
      view.rerender(<RichTextEditor {...props} toolbarContainer={null} />);
      expect(within(host).queryByTestId('rich-text-toolbar')).toBeNull();
      expect(within(view.container).getByTestId('rich-text-toolbar')).toBeVisible();
      expect(editor!.getHTML()).toContain('<strong>Selected text</strong>');
      view.unmount();
      expect(host).toBeEmptyDOMElement();
    } finally { host.remove(); }
  });
  it('uses live font controls and moves insertion tools into Insert without letting Escape close the composer', async () => {
    const format = document.createElement('div');
    const insert = document.createElement('div');
    document.body.append(format, insert);
    let editor: Editor | undefined;
    const composerKeyDown = vi.fn();
    const view = render(<div onKeyDownCapture={composerKeyDown}>
      <RichTextEditor content="<p>Format me</p>" onChange={() => {}} onEditorReady={value => { editor = value; }} toolbarContainer={format} insertContainer={insert} />
    </div>);
    try {
      await waitFor(() => expect(editor).toBeDefined());
      act(() => { editor!.commands.selectAll(); });
      fireEvent.change(within(format).getByRole('combobox', { name: 'font_family' }), { target: { value: 'Georgia' } });
      fireEvent.change(within(format).getByRole('combobox', { name: 'font_size' }), { target: { value: '24px' } });
      expect(editor!.getHTML()).toContain('font-family: Georgia');
      expect(editor!.getHTML()).toContain('font-size: 24px');
      expect(within(format).queryByRole('button', { name: 'table' })).toBeNull();
      const table = within(insert).getByRole('button', { name: 'table' });
      fireEvent.click(table);
      expect(document.querySelector('[data-editor-toolbar-popup="table"]')).toBeVisible();
      composerKeyDown.mockClear();
      fireEvent.keyDown(table, { key: 'Escape' });
      expect(document.querySelector('[data-editor-toolbar-popup="table"]')).toBeNull();
      expect(composerKeyDown).not.toHaveBeenCalled();
    } finally { view.unmount(); format.remove(); insert.remove(); }
  });

});
