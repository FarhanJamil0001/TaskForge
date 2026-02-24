'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { ListKeymap } from '@tiptap/extension-list';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { Extension, InputRule } from '@tiptap/core';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Y from 'yjs';
import { createClient } from '@/lib/supabase/client';
import { SupabaseProvider } from '@/lib/y-supabase-provider';
import type { ProjectDocument } from './document-hub';

const COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00',
  '#F4511E', '#6D4C41',
];

function hashToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const BulletSlashCommand = Extension.create({
  name: 'bulletSlashCommand',
  addInputRules() {
    return [
      new InputRule({
        find: /^\/bullet\s$/,
        handler: ({ commands }) => {
          commands.toggleBulletList();
        },
      }),
    ];
  },
});

function FormatButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition ${
        active
          ? 'bg-brand-500/20 text-brand-600'
          : 'text-txt-secondary hover:bg-gray-200 hover:text-txt-primary'
      }`}
    >
      {children}
    </button>
  );
}

const SAVE_DEBOUNCE_MS = 600;
const SAVE_INTERVAL_MS = 4000;

export type ViewingUser = { name: string; color: string };

export function CollaborativeDocumentEditor({
  doc,
  projectId,
  onDocUpdate,
  onUsersChange,
}: {
  doc: ProjectDocument;
  projectId: string;
  onDocUpdate: (doc: ProjectDocument) => void;
  onUsersChange?: (users: ViewingUser[]) => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState(doc.title);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  } | null>(null);

  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseProvider | null>(null);

  const { yDoc, provider } = useMemo(() => {
    const ydoc = new Y.Doc();

    if (doc.yjs_state) {
      try {
        let update: Uint8Array;
        if (doc.yjs_state instanceof ArrayBuffer) {
          update = new Uint8Array(doc.yjs_state);
        } else if (typeof doc.yjs_state === 'string') {
          const hex = doc.yjs_state.replace(/^\\x/, '');
          update = new Uint8Array(
            (hex.match(/.{1,2}/g) ?? []).map((byte: string) => parseInt(byte, 16)),
          );
        } else {
          update = new Uint8Array(doc.yjs_state as ArrayBuffer);
        }
        if (update.length > 0) {
          Y.applyUpdate(ydoc, update);
        }
      } catch (e) {
        console.warn('Failed to load yjs_state, starting fresh:', e);
      }
    }
    // Legacy JSON content migration: docs without yjs_state start empty.
    // First collaborator to open will have empty doc; others will sync via Yjs.

    const prov = new SupabaseProvider(
      `doc-yjs:${doc.id}`,
      ydoc,
      supabase,
      {
        awareness: true,
        broadcastThrottleMs: 100,
      },
    );

    yDocRef.current = ydoc;
    providerRef.current = prov;

    return { yDoc: ydoc, provider: prov };
  }, [doc.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only recreate when doc id changes

  const userInfo = useMemo(() => {
    if (!currentUser) return { name: 'Anonymous', color: '#6D4C41' };
    const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ');
    return {
      name: fullName || currentUser.email?.split('@')[0] || 'Anonymous',
      color: hashToColor(currentUser.id),
    };
  }, [currentUser]);

  const saveYjsState = useCallback(async () => {
    if (!yDocRef.current || !doc.id) return;
    const state = Y.encodeStateAsUpdate(yDocRef.current);
    if (state.length <= 2) return;

    try {
      await fetch(`/api/documents/${doc.id}/yjs-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: Array.from(new Uint8Array(state)) }),
      });
    } catch (e) {
      console.warn('Document save failed:', e);
    }
  }, [doc.id]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<number>(0);
  const hasUnsavedChangesRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setCurrentUser(null);
        return;
      }
      const meta = user.user_metadata as { first_name?: string; last_name?: string } | undefined;
      setCurrentUser({
        id: user.id,
        email: user.email ?? undefined,
        first_name: meta?.first_name,
        last_name: meta?.last_name,
      });
    });
  }, [supabase]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        undoRedo: false,
      }),
      ListKeymap,
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class: 'bg-yellow-200 rounded px-0.5',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your project ideas, notes, and plans...',
      }),
      BulletSlashCommand,
      Collaboration.configure({
        document: yDoc,
      }),
      CollaborationCaret.configure({
        provider,
        user: userInfo,
        render: (user: { name?: string; color?: string }) => {
          const cursor = document.createElement('span');
          cursor.style.cssText = `
            display: inline-block;
            width: 2px;
            min-height: 1em;
            background-color: ${user.color ?? '#6D4C41'};
            margin-left: -1px;
            vertical-align: text-bottom;
          `;
          cursor.title = user.name ?? '';
          return cursor;
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          'min-h-[300px] px-4 py-3 focus:outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:medium [&_ul]:list-disc [&_ul]:pl-6 [&_ul_ul]:list-[circle] [&_ol]:list-decimal [&_ol]:pl-6 [&_ol_ol]:list-[lower-alpha] [&_p]:mb-2',
      },
    },
  });

  // Save after any document change (local or remote) so we never lose data.
  // Previously we only saved on provider 'message' (remote only), so local edits were not persisted until unmount.
  useEffect(() => {
    if (!yDocRef.current) return;

    const scheduleSave = () => {
      hasUnsavedChangesRef.current = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        saveYjsState().then(() => {
          hasUnsavedChangesRef.current = false;
          lastSavedRef.current = Date.now();
        });
      }, SAVE_DEBOUNCE_MS);
    };

    const yDoc = yDocRef.current;
    const onDocUpdate = () => scheduleSave();

    yDoc.on('update', onDocUpdate);

    return () => {
      yDoc.off('update', onDocUpdate);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [saveYjsState]);

  // Flush save when tab becomes hidden (e.g. switch tab, close) so we don't lose data.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChangesRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        saveYjsState().then(() => {
          hasUnsavedChangesRef.current = false;
        });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [saveYjsState]);

  // Periodic save when there are unsaved changes (safety net for multi-user / long sessions).
  useEffect(() => {
    const id = setInterval(() => {
      if (!hasUnsavedChangesRef.current) return;
      if (Date.now() - lastSavedRef.current < SAVE_INTERVAL_MS) return;
      saveYjsState().then(() => {
        hasUnsavedChangesRef.current = false;
        lastSavedRef.current = Date.now();
      });
    }, SAVE_INTERVAL_MS);

    saveIntervalRef.current = id;
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [saveYjsState]);

  useEffect(() => {
    editor?.commands.updateUser(userInfo);
  }, [editor, userInfo]);

  useEffect(() => {
    const awareness = provider?.getAwareness();
    if (!awareness || !onUsersChange) return;

    const sync = () => {
      const states = awareness.getStates();
      const users: ViewingUser[] = [];
      states.forEach((state) => {
        const u = state?.user;
        if (u?.name && u?.color) {
          users.push({ name: u.name, color: u.color });
        }
      });
      onUsersChange(users);
    };

    sync();
    awareness.on('update', sync);
    return () => awareness.off('update', sync);
  }, [provider, onUsersChange]);

  const saveTitle = useCallback(
    async (newTitle: string) => {
      const trimmed = newTitle.trim() || 'Untitled';
      setTitle(trimmed);
      await supabase
        .from('project_documents')
        .update({ title: trimmed })
        .eq('id', doc.id);
      onDocUpdate({ ...doc, title: trimmed });
    },
    [doc, onDocUpdate, supabase],
  );

  useEffect(() => {
    setTitle(doc.title);
  }, [doc.title]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      saveYjsState();
      providerRef.current?.destroy();
      yDocRef.current?.destroy();
    };
  }, [saveYjsState]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-monday-border bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-monday-border px-4 py-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveTitle(title)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-txt-primary focus:outline-none"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-2">
          <FormatButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (⌘B)"
          >
            <strong className="text-sm font-bold">B</strong>
          </FormatButton>
          <FormatButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            title="Highlight (⌘⇧H)"
          >
            <span className="rounded bg-yellow-200 px-1 text-xs font-medium">
              H
            </span>
          </FormatButton>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
