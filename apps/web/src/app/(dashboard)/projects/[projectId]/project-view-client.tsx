'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BoardTable } from '@/components/board-table';
import { DocumentHub, type ProjectDocument } from '@/components/document-hub';
import { DiscordPanel } from '@/components/discord-panel';
import type { Task } from '@taskforge/shared';
import { createClient } from '@/lib/supabase/client';
import type { ProjectView } from './page';

function SortableTab({
  view,
  isSelected,
  editingId,
  editingName,
  viewsLength,
  onSelect,
  onStartRename,
  onEditingNameChange,
  onFinishRename,
  onCancelRename,
  onDelete,
}: {
  view: ProjectView;
  isSelected: boolean;
  editingId: string | null;
  editingName: string;
  viewsLength: number;
  onSelect: () => void;
  onStartRename: () => void;
  onEditingNameChange: (v: string) => void;
  onFinishRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: view.id, disabled: editingId === view.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/tab flex shrink-0 items-center gap-1 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-txt-secondary hover:bg-gray-100 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder tab"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="4" cy="2" r="1" />
          <circle cx="8" cy="2" r="1" />
          <circle cx="4" cy="6" r="1" />
          <circle cx="8" cy="6" r="1" />
          <circle cx="4" cy="10" r="1" />
          <circle cx="8" cy="10" r="1" />
        </svg>
      </div>
      {editingId === view.id ? (
        <input
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onBlur={onFinishRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') onCancelRename();
          }}
          autoFocus
          className="min-w-[80px] rounded border border-brand-500 bg-white px-2 py-1.5 text-sm text-txt-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      ) : (
        <button
          onClick={onSelect}
          className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition touch-manipulation ${
            isSelected
              ? 'text-brand-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand-500 after:content-[""]'
              : 'text-txt-secondary hover:text-txt-primary active:text-txt-primary'
          }`}
        >
          {view.name}
        </button>
      )}
      <div className="flex items-center gap-0.5 opacity-0 transition group-hover/tab:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
          className="rounded p-1 text-txt-secondary hover:bg-gray-100 hover:text-txt-primary"
          title="Rename"
          aria-label="Rename tab"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
            <path d="M7 2l3 3-6 6H1V9l6-7z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {viewsLength > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-txt-secondary hover:bg-red-50 hover:text-red-600"
            title="Delete"
            aria-label="Delete tab"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
              <path d="M2 3h8M4 3V2a1 1 0 011-1h2a1 1 0 011 1v1M2 3v7a1 1 0 001 1h6a1 1 0 001-1V3" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5 5v4M7 5v4" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function ProjectViewClient({
  projectId,
  projectName,
  orgId,
  orgName,
  connectCode,
  initialViews,
  tasksByBoardId,
  userId,
  initialDocs,
}: {
  projectId: string;
  projectName: string;
  orgId: string;
  orgName: string;
  connectCode: string | null;
  initialViews: ProjectView[];
  tasksByBoardId: Record<string, Task[]>;
  userId: string;
  initialDocs: ProjectDocument[];
}) {
  const [views, setViews] = useState<ProjectView[]>(initialViews);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(
    initialViews[0]?.id ?? null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingView, setAddingView] = useState(false);
  const addingViewRef = useRef(false);
  addingViewRef.current = addingView;
  const supabase = createClient();

  useEffect(() => {
    setViews(initialViews);
    setSelectedViewId((prev) => {
      const stillExists = initialViews.some((v) => v.id === prev);
      return stillExists ? prev : initialViews[0]?.id ?? null;
    });
  }, [initialViews]);

  // Realtime: sync views when other users add/rename/delete tabs
  useEffect(() => {
    const channel = supabase
      .channel(`project_views:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_views',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const v = payload.new as ProjectView;
            setViews((prev) => {
              if (prev.some((existing) => existing.id === v.id)) return prev;
              return [...prev, v].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ProjectView;
            setViews((prev) =>
              prev.map((v) => (v.id === updated.id ? updated : v)).sort((a, b) => a.position - b.position),
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as ProjectView;
            setViews((prev) => prev.filter((v) => v.id !== deleted.id));
            setSelectedViewId((prev) =>
              prev === deleted.id ? null : prev,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  // If selected view was deleted, pick first available
  useEffect(() => {
    if (selectedViewId && !views.some((v) => v.id === selectedViewId)) {
      setSelectedViewId(views[0]?.id ?? null);
    }
  }, [views, selectedViewId]);

  const selectedView = views.find((v) => v.id === selectedViewId);

  const updateView = useCallback(
    async (viewId: string, updates: Partial<Pick<ProjectView, 'name' | 'position'>>) => {
      setViews((prev) =>
        prev.map((v) => (v.id === viewId ? { ...v, ...updates } : v)),
      );
      await supabase.from('project_views').update(updates).eq('id', viewId);
    },
    [supabase],
  );

  const addView = useCallback(async () => {
    if (addingViewRef.current) return;
    addingViewRef.current = true;
    setAddingView(true);
    try {
      const boardCount = views.filter((v) => v.type === 'board').length;
      const { data: newBoard } = await supabase
        .from('boards')
        .insert({
          project_id: projectId,
          name: `Board ${boardCount + 1}`,
          is_default: false,
          created_by: userId,
        })
        .select()
        .single();

      if (!newBoard) return;

      const maxPos = Math.max(0, ...views.map((v) => v.position));
      const { data: newView } = await supabase
        .from('project_views')
        .insert({
          project_id: projectId,
          type: 'board',
          name: newBoard.name,
          board_id: newBoard.id,
          position: maxPos + 1,
        })
        .select()
        .single();

      if (newView) {
        setViews((prev) => [...prev, newView as ProjectView].sort((a, b) => a.position - b.position));
        setSelectedViewId(newView.id);
      }
    } finally {
      addingViewRef.current = false;
      setAddingView(false);
    }
  }, [projectId, userId, views, supabase]);

  const deleteView = useCallback(
    async (viewId: string) => {
      const view = views.find((v) => v.id === viewId);
      if (!view) return;
      if (views.length <= 1) return;

      const idx = views.findIndex((v) => v.id === viewId);
      const nextView = views[idx + 1] ?? views[idx - 1];

      await supabase.from('project_views').delete().eq('id', viewId);
      if (view.type === 'board' && view.board_id) {
        await supabase.from('boards').delete().eq('id', view.board_id);
      }

      setViews((prev) => prev.filter((v) => v.id !== viewId));
      if (selectedViewId === viewId) {
        setSelectedViewId(nextView?.id ?? null);
      }
    },
    [views, selectedViewId, supabase],
  );

  const startRename = (view: ProjectView) => {
    setEditingId(view.id);
    setEditingName(view.name);
  };

  const finishRename = useCallback(() => {
    if (!editingId) return;
    const trimmed = editingName.trim() || 'Untitled';
    updateView(editingId, { name: trimmed });
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, updateView]);

  const handleReorder = useCallback(
    async (reordered: ProjectView[]) => {
      setViews(reordered);
      await Promise.all(
        reordered.map((v, i) =>
          supabase.from('project_views').update({ position: i }).eq('id', v.id),
        ),
      );
    },
    [supabase],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = views.findIndex((v) => v.id === active.id);
      const newIndex = views.findIndex((v) => v.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(views, oldIndex, newIndex);
      handleReorder(reordered);
    },
    [views, handleReorder],
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-txt-primary sm:text-[22px]">
            {projectName}
          </h1>
          <div className="shrink-0">
            <DiscordPanel
              orgId={orgId}
              orgName={orgName}
              connectCode={connectCode}
              projectId={projectId}
              projectName={projectName}
            />
          </div>
        </div>

        {/* Editable tabs */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="mt-3 flex items-center gap-0.5 border-b border-monday-border overflow-x-auto">
            <SortableContext
              items={views.map((v) => v.id)}
              strategy={horizontalListSortingStrategy}
            >
              {views.map((view) => (
                <SortableTab
                  key={view.id}
                  view={view}
                  isSelected={selectedViewId === view.id}
                  editingId={editingId}
                  editingName={editingName}
                  viewsLength={views.length}
                  onSelect={() => setSelectedViewId(view.id)}
                  onStartRename={() => startRename(view)}
                  onEditingNameChange={setEditingName}
                  onFinishRename={finishRename}
                  onCancelRename={() => {
                    setEditingId(null);
                    setEditingName('');
                  }}
                  onDelete={() => deleteView(view.id)}
                />
              ))}
            </SortableContext>
            <button
            onClick={addView}
            disabled={addingView}
            className="shrink-0 rounded p-2 text-txt-secondary hover:bg-gray-100 hover:text-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add tab"
            aria-label="Add tab"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
              <path d="M8 3v10M3 8h10" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          </div>
        </DndContext>
      </div>

      {/* Content: render all tabs but only show selected for instant switching */}
      <div className="contents">
        {views.map((view) => (
          <div
            key={view.id}
            className={selectedViewId === view.id ? 'block' : 'hidden'}
            role="tabpanel"
            aria-hidden={selectedViewId !== view.id}
          >
            {view.type === 'board' && view.board_id && (
              <BoardTable
                key={view.board_id}
                boardId={view.board_id}
                orgId={orgId}
                initialTasks={tasksByBoardId[view.board_id] ?? []}
                userId={userId}
              />
            )}
            {view.type === 'documents' && (
              <DocumentHub
                key="documents"
                projectId={projectId}
                initialDocs={initialDocs}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
