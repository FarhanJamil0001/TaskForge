'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CollaborativeDocumentEditor,
  type ViewingUser,
} from '@/components/collaborative-document-editor';

export type ProjectDocument = {
  id: string;
  project_id: string;
  title: string;
  content: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  position?: number;
  yjs_state?: ArrayBuffer | string | null;
};

function NewDocumentButton({
  projectId,
  nextPosition,
  onCreated,
}: {
  projectId: string;
  nextPosition: number;
  onCreated: (doc: ProjectDocument) => void;
}) {
  const supabase = createClient();
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('project_documents')
      .insert({
        project_id: projectId,
        title: 'Untitled',
        content: {},
        created_by: user.id,
        position: nextPosition,
      })
      .select()
      .single();
    setCreating(false);
    if (!error && data) onCreated(data as ProjectDocument);
  }

  return (
    <button
      onClick={handleClick}
      disabled={creating}
      className="rounded p-1 text-txt-secondary transition hover:bg-gray-200 hover:text-txt-primary disabled:opacity-50"
      title="New document"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 3v10M3 8h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function SortableDocumentItem({
  doc,
  isSelected,
  onSelect,
}: {
  doc: ProjectDocument;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
        isDragging ? 'opacity-50' : ''
      } ${
        isSelected
          ? 'bg-brand-500/10 text-brand-600'
          : 'text-txt-secondary hover:bg-gray-100 hover:text-txt-primary'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab touch-none rounded p-0.5 hover:bg-gray-200 active:cursor-grabbing"
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-txt-secondary"
        >
          <circle cx="9" cy="6" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="18" r="1" />
          <circle cx="15" cy="6" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="18" r="1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate text-left"
      >
        <span className="truncate">{doc.title || 'Untitled'}</span>
      </button>
    </div>
  );
}

function DocumentList({
  docs,
  selectedId,
  onSelect,
  onReorder,
}: {
  docs: ProjectDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (reordered: ProjectDocument[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = docs.findIndex((d) => d.id === active.id);
    const newIndex = docs.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(docs, oldIndex, newIndex);
    onReorder(reordered);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={docs.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <nav className="space-y-0.5">
          {docs.map((doc) => (
            <SortableDocumentItem
              key={doc.id}
              doc={doc}
              isSelected={selectedId === doc.id}
              onSelect={() => onSelect(doc.id)}
            />
          ))}
        </nav>
      </SortableContext>
    </DndContext>
  );
}

function EmptyState({
  projectId,
  onCreate,
}: {
  projectId: string;
  onCreate: (doc: ProjectDocument) => void;
}) {
  const supabase = createClient();
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('project_documents')
      .insert({
        project_id: projectId,
        title: 'Untitled',
        content: {},
        created_by: user.id,
        position: 0,
      })
      .select()
      .single();
    setCreating(false);
    if (!error && data) onCreate(data as ProjectDocument);
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-monday-border bg-gray-50/50 py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold text-txt-primary">
        Document Hub
      </h3>
      <p className="mb-6 max-w-sm text-center text-sm text-txt-secondary">
        Plan project ideas, keep notes, and document your work in one place.
      </p>
      <button
        onClick={handleCreate}
        disabled={creating}
        className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
      >
        {creating ? (
          'Creating...'
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Create your first document
          </>
        )}
      </button>
    </div>
  );
}

export function DocumentHub({
  projectId,
  initialDocs,
}: {
  projectId: string;
  initialDocs: ProjectDocument[];
}) {
  const [docs, setDocs] = useState<ProjectDocument[]>(initialDocs);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDocs[0]?.id ?? null,
  );
  const [viewingUsers, setViewingUsers] = useState<ViewingUser[]>([]);
  const supabase = createClient();

  const selectedDoc = docs.find((d) => d.id === selectedId);

  // Auto-select first doc when selected doc was deleted or list changed
  useEffect(() => {
    if (docs.length > 0 && (!selectedId || !selectedDoc)) {
      setSelectedId(docs[0].id);
    }
  }, [docs, selectedId, selectedDoc]);

  // Clear viewing users when switching documents (new provider will populate)
  useEffect(() => {
    setViewingUsers([]);
  }, [selectedId]);

  // Realtime subscription: sync documents when changed by other users/tabs
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setupSubscription = async (attempt = 0) => {
      if (cancelled) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!user || !token) {
        if (attempt < 3) {
          setTimeout(() => setupSubscription(attempt + 1), [500, 1500, 3000][attempt]);
        }
        return;
      }

      supabase.realtime.setAuth(token);
      if (cancelled) return;
      channel = supabase
        .channel(`project_documents:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_documents',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newDoc = payload.new as ProjectDocument;
              setDocs((prev) => {
                if (prev.some((d) => d.id === newDoc.id)) return prev;
                return [...prev, newDoc].sort(
                  (a, b) => (a.position ?? 0) - (b.position ?? 0),
                );
              });
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as ProjectDocument;
              setDocs((prev) =>
                prev.map((d) => (d.id === updated.id ? updated : d)),
              );
            } else if (payload.eventType === 'DELETE') {
              const deleted = payload.old as ProjectDocument;
              setDocs((prev) => prev.filter((d) => d.id !== deleted.id));
              setSelectedId((id) =>
                id === deleted.id ? null : id,
              );
            }
          },
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) supabase.realtime.setAuth(session.access_token);
            });
          }
        });
    };

    setupSubscription();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) supabase.realtime.setAuth(session.access_token);
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  const handleDocUpdate = useCallback((updated: ProjectDocument) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
    );
  }, []);

  const handleCreate = useCallback((doc: ProjectDocument) => {
    setDocs((prev) => [...prev, doc]);
    setSelectedId(doc.id);
  }, []);

  const handleReorder = useCallback(
    async (reordered: ProjectDocument[]) => {
      setDocs(reordered);
      const supabase = createClient();
      await Promise.all(
        reordered.map((doc, index) =>
          supabase
            .from('project_documents')
            .update({ position: index })
            .eq('id', doc.id),
        ),
      );
    },
    [],
  );

  if (docs.length === 0) {
    return <EmptyState projectId={projectId} onCreate={handleCreate} />;
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-txt-secondary">
            Documents
          </span>
          <NewDocumentButton
            projectId={projectId}
            nextPosition={docs.length}
            onCreated={handleCreate}
          />
        </div>
        <DocumentList
          docs={docs}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onReorder={handleReorder}
        />
        {viewingUsers.length > 0 && (
          <div className="mt-6 border-t border-monday-border pt-4">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-txt-secondary">
              Viewing
            </span>
            <div className="space-y-1.5">
              {viewingUsers.map((u) => (
                <div
                  key={`${u.name}-${u.color}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className="h-3 w-0.5 shrink-0 rounded-full"
                    style={{ backgroundColor: u.color }}
                  />
                  <span className="truncate text-txt-primary">{u.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Editor */}
      <div className="min-w-0 flex-1">
        {selectedDoc && (
          <CollaborativeDocumentEditor
            key={selectedDoc.id}
            doc={selectedDoc}
            projectId={projectId}
            onDocUpdate={handleDocUpdate}
            onUsersChange={setViewingUsers}
          />
        )}
      </div>
    </div>
  );
}
