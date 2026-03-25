'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { ListKeymap } from '@tiptap/extension-list';

export type TaskDescriptionEditorRef = {
  /** `undefined` if the editor is not mounted yet */
  getContent: () => string | null | undefined;
};

export type TaskDescriptionEditorProps = {
  initialContent: string;
  /** If set, persists HTML after idle debounce (task drawer). Omit for explicit save only (e.g. notes popover). */
  onDebouncedSave?: (content: string | null) => void;
  placeholder?: string;
  /** Narrow layout: smaller toolbar + editor chrome */
  compact?: boolean;
  /** Tailwind min-h-* class for the editable region */
  editorMinHeightClass?: string;
  /** Focus editor when mounted (e.g. notes popover) */
  autoFocus?: boolean;
};

function contentFromEditor(ed: Editor): string | null {
  return ed.isEmpty ? null : ed.getHTML();
}

export const TaskDescriptionEditor = forwardRef<
  TaskDescriptionEditorRef,
  TaskDescriptionEditorProps
>(function TaskDescriptionEditor(
  {
    initialContent,
    onDebouncedSave,
    placeholder = 'What is this task about?',
    compact = false,
    editorMinHeightClass = 'min-h-[120px]',
    autoFocus = false,
  },
  ref,
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialContent);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Highlight,
      ListKeymap,
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none px-0 py-2 ${editorMinHeightClass}`,
      },
    },
    onUpdate: onDebouncedSave
      ? ({ editor: ed }) => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            const html = ed.getHTML();
            const next = ed.isEmpty ? '' : html;
            if (next !== lastSavedRef.current) {
              lastSavedRef.current = next;
              onDebouncedSave(next || null);
            }
          }, 800);
        }
      : undefined,
  });

  useImperativeHandle(
    ref,
    () => ({
      getContent: () => (editor ? contentFromEditor(editor) : undefined),
    }),
    [editor],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!autoFocus || !editor) return;
    const t = setTimeout(() => editor.commands.focus('end'), 0);
    return () => clearTimeout(t);
  }, [autoFocus, editor]);

  if (!editor) return null;

  const pad = compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs';

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1 border-b border-monday-border pb-2 dark:border-zinc-600">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded ${pad} font-medium transition ${
            editor.isActive('bold')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded ${pad} italic transition ${
            editor.isActive('italic')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`rounded ${pad} line-through transition ${
            editor.isActive('strike')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          S
        </button>
        <div className="mx-1 w-px bg-monday-border dark:bg-zinc-600" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded ${pad} transition ${
            editor.isActive('bulletList')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
            <path d="M5 3h7M5 7h7M5 11h7" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="2" cy="3" r="1" fill="currentColor" />
            <circle cx="2" cy="7" r="1" fill="currentColor" />
            <circle cx="2" cy="11" r="1" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded ${pad} transition ${
            editor.isActive('orderedList')
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
            <path d="M5 3h7M5 7h7M5 11h7" strokeWidth="1.5" strokeLinecap="round" />
            <text x="0.5" y="5" fontSize="5" fill="currentColor" className="font-mono">
              1
            </text>
            <text x="0.5" y="9" fontSize="5" fill="currentColor" className="font-mono">
              2
            </text>
            <text x="0.5" y="13" fontSize="5" fill="currentColor" className="font-mono">
              3
            </text>
          </svg>
        </button>
        <div className="mx-1 w-px bg-monday-border dark:bg-zinc-600" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded ${pad} font-bold transition ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`rounded ${pad} transition ${
            editor.isActive('highlight')
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
              : 'text-txt-secondary hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="9" width="12" height="4" rx="1" fill="currentColor" opacity="0.3" />
            <path d="M3 9V3a1 1 0 011-1h6a1 1 0 011 1v6" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});
