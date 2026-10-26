import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { GapCursor } from '@tiptap/pm/gapcursor';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import type { Editor as ReactEditor } from '@tiptap/react';

import { QuotedHtml, buildQuotedHtmlBlock, serializeEditorContent } from '../quoted-html';

// A reply opened with the quoted original selected as a node. Tabbing from
// Subject into the body kept that selection, so the first key typed replaced
// the whole quote and the reply went out without it.

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

function mountReply(showQuoteBorder = true): Editor {
  return new Editor({
    extensions: [Document, Paragraph, Text, QuotedHtml],
    content: `<p></p>${buildQuotedHtmlBlock('<p>Original message</p>', { showQuoteBorder })}`,
  });
}

function selectQuote(e: Editor) {
  let pos = -1;
  e.state.doc.descendants((node, p) => {
    if (node.type.name === 'quotedHtml') pos = p;
  });
  e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, pos)));
}

describe('QuotedHtml focus', () => {
  it('redirects the gap between the separator and quote to the reply paragraph', () => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, HorizontalRule, QuotedHtml],
      content: `<p></p><hr>${buildQuotedHtmlBlock('<p>From: Sender</p><p>Original message</p>', { showQuoteBorder: false })}`,
    });
    let quotePosition = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'quotedHtml') quotePosition = pos;
    });
    editor.view.dispatch(editor.state.tr.setSelection(new GapCursor(editor.state.doc.resolve(quotePosition))));
    expect(editor.state.selection).toBeInstanceOf(TextSelection);
    expect(editor.state.selection.from).toBe(1);
    editor.commands.insertContent('My reply');
    expect(editor.state.doc.firstChild?.textContent).toBe('My reply');
    const saved = serializeEditorContent(editor as unknown as ReactEditor);
    expect(saved).toContain('<hr>');
    expect(saved).toContain('Original message');
  });

  it('moves a selection resting on the quote to the start of the body on focus', () => {
    editor = mountReply();
    selectQuote(editor);

    editor.view.dom.dispatchEvent(new FocusEvent('focus'));

    expect(editor.state.selection).toBeInstanceOf(TextSelection);
    expect(editor.state.selection.from).toBe(1);
  });

  it.each([true, false])('keeps the quote when typing after focus (border: %s)', (showQuoteBorder) => {
    editor = mountReply(showQuoteBorder);
    selectQuote(editor);

    editor.view.dom.dispatchEvent(new FocusEvent('focus'));
    editor.commands.insertContent('Sure, numbers on Thursday.');

    const html = serializeEditorContent(editor as unknown as ReactEditor);
    expect(html).toContain('Sure, numbers on Thursday.');
    expect(html).toContain('Original message');
  });

  it('leaves a text selection alone', () => {
    editor = mountReply();
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1)));
    const before = editor.state.selection;

    editor.view.dom.dispatchEvent(new FocusEvent('focus'));

    expect(editor.state.selection.eq(before)).toBe(true);
  });
});

describe('editor focus from the keyboard', () => {
  // A new message is built with the signature in it, which leaves the
  // selection after the signature. Tabbing in from Subject typed there.
  function mountCompose(): Editor {
    const e = new Editor({
      extensions: [Document, Paragraph, Text, QuotedHtml],
      content: '<p></p><p>-- </p><p>User A</p>',
    });
    e.view.dispatch(e.state.tr.setSelection(TextSelection.atEnd(e.state.doc)));
    return e;
  }

  it('puts the caret at the start on the first focus', () => {
    editor = mountCompose();

    editor.view.dom.dispatchEvent(new FocusEvent('focus'));

    expect(editor.state.selection.from).toBe(1);
  });

  it('keeps the caret where a click put it', () => {
    editor = mountCompose();
    const end = editor.state.selection.from;

    // ProseMirror's own click handling asks for the element under the
    // pointer, which jsdom does not implement.
    const doc = document as Document & { elementFromPoint: Document['elementFromPoint'] };
    const original = doc.elementFromPoint;
    doc.elementFromPoint = () => null;
    try {
      editor.view.dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      editor.view.dom.dispatchEvent(new FocusEvent('focus'));
    } finally {
      doc.elementFromPoint = original;
    }

    expect(editor.state.selection.from).toBe(end);
  });

  it('keeps the position when focus comes back later', () => {
    editor = mountCompose();
    editor.view.dom.dispatchEvent(new FocusEvent('focus'));
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc)));
    const end = editor.state.selection.from;

    editor.view.dom.dispatchEvent(new FocusEvent('focus'));

    expect(editor.state.selection.from).toBe(end);
  });
});
