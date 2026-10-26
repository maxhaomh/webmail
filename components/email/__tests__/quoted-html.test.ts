import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { buildQuotedHtmlBlock, QuotedHtml, serializeEditorContent } from '../quoted-html';

const createEditor = (content: string) => new Editor({ extensions: [StarterKit, QuotedHtml], content });

describe('HTML quote borders', () => {
  it('preserves quotes without parsing the original into the page, where its images would load', () => {
    // A browser fetches an <img> as soon as it is parsed into an element of
    // the live document, attached or not: that fires the tracker the remote
    // content setting holds back.
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    const liveParses: string[] = [];
    Object.defineProperty(Element.prototype, 'innerHTML', {
      ...descriptor,
      set(this: Element, value: string) {
        if (this.ownerDocument === document && this.tagName !== 'TEMPLATE') liveParses.push(value);
        descriptor.set!.call(this, value);
      },
    });
    let html = '';
    try {
      html = buildQuotedHtmlBlock('<blockquote><img src="https://tracker.example/p.png">Hi</blockquote>', { showQuoteBorder: false });
    } finally {
      Object.defineProperty(Element.prototype, 'innerHTML', descriptor);
    }
    expect(liveParses.filter((value) => value.includes('tracker.example'))).toEqual([]);
    expect(html).toContain('<img src="https://tracker.example/p.png">');
    expect(html).toContain('<blockquote>');
  });

  it('preserves borders on older HTML quote islands inside a borderless reply', () => {
    const olderQuote = buildQuotedHtmlBlock('<p>Older message</p>');
    const result = buildQuotedHtmlBlock('<div>Latest reply</div>' + olderQuote, { showQuoteBorder: false });
    const parsed = document.createElement('div');
    parsed.innerHTML = result;
    const outer = parsed.firstElementChild as HTMLElement;
    const older = outer.querySelector<HTMLElement>('[data-quoted-html]')!;
    expect(outer.style.borderLeftWidth).toBe('');
    expect(older.style.borderLeftWidth).toBe('2px');
    expect(older.hasAttribute('data-quote-border')).toBe(false);
    expect(result).toContain(olderQuote);
  });

  it('preserves the Outlook header layout without adding spacing through draft round-trips', () => {
    const header = '<hr style="display:inline-block;width:98%" tabindex="-1"><div id="divRplyFwdMsg" dir="ltr"><font face="Calibri, sans-serif" style="font-size:11pt" color="#000000"><b>From:</b> Max &lt;max@example.com&gt;<br><b>Sent:</b> Thursday, September 24, 2026 11:41 PM<br><b>Subject:</b> Hello world</font></div>';
    const original = header + '<div>Hello World!</div>';
    const editor = createEditor(buildQuotedHtmlBlock(original, { showQuoteBorder: false }));
    try {
      expect(editor.view.dom.querySelector<HTMLElement>('.quoted-html-island')?.style.marginTop).toBe('0px');
      const saved = serializeEditorContent(editor);
      const parsed = document.createElement('div');
      parsed.innerHTML = saved;
      expect(parsed.querySelector('hr')?.style.cssText).toBe('display: inline-block; width: 98%;');
      expect(parsed.querySelector('font')?.getAttribute('face')).toBe('Calibri, sans-serif');
      expect(parsed.querySelectorAll('p')).toHaveLength(0);
      expect(parsed.querySelector('#divRplyFwdMsg')?.nextElementSibling?.textContent).toBe('Hello World!');
      expect(parsed.textContent).not.toContain('\u00a0');
      const reopened = createEditor(saved);
      try { expect(serializeEditorContent(reopened)).toBe(saved); }
      finally { reopened.destroy(); }
    } finally { editor.destroy(); }
  });

  it('keeps normal quote styling by default', () => {
    const original = '<blockquote>Original reply</blockquote>';
    const editor = createEditor(buildQuotedHtmlBlock(original));
    try {
      expect(editor.view.dom.querySelector<HTMLElement>('.quoted-html-island')?.style.borderLeftWidth).toBe('2px');
      expect(serializeEditorContent(editor)).toContain(original);
    } finally { editor.destroy(); }
  });

  it('removes only the outer quote border and preserves older quotes after reopening', () => {
    const original = '<div>Latest reply</div><blockquote class="gmail_quote" style="border-left:2px solid gray">Ok no problem<hr><blockquote>Hello this is a quick test<br><a href="mailto:max@example.com">Max</a></blockquote></blockquote><table><tbody><tr><td>Layout</td></tr></tbody></table>';
    const editor = createEditor(buildQuotedHtmlBlock(original, { showQuoteBorder: false }));
    let saved = '';
    try {
      const island = editor.view.dom.querySelector<HTMLElement>('.quoted-html-island')!;
      expect(island.style.borderLeftWidth).toBe('');
      expect(island.style.paddingLeft).toBe('');
      expect(island.shadowRoot?.querySelectorAll('blockquote')).toHaveLength(2);
      expect(island.shadowRoot?.querySelector<HTMLElement>('.gmail_quote')?.style.borderLeftWidth).toBe('2px');
      expect(island.shadowRoot?.textContent).toContain('Ok no problem');
      expect(island.shadowRoot?.querySelector('a')?.getAttribute('href')).toBe('mailto:max@example.com');
      expect(island.shadowRoot?.querySelector('td')?.textContent).toBe('Layout');
      saved = serializeEditorContent(editor);
      expect(saved).toContain('data-quote-border="false"');
      expect(saved).toContain(original);
    } finally { editor.destroy(); }
    const reopened = createEditor(saved);
    try {
      expect(reopened.view.dom.querySelector<HTMLElement>('.quoted-html-island')?.style.borderLeftWidth).toBe('');
      expect(reopened.view.dom.querySelector('.quoted-html-island')?.shadowRoot?.querySelectorAll('blockquote')).toHaveLength(2);
      expect(serializeEditorContent(reopened)).toBe(saved);
    } finally { reopened.destroy(); }
  });
});
