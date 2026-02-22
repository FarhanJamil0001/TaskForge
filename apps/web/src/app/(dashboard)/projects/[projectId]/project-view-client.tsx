'use client';

import { useState } from 'react';
import { BoardTable } from '@/components/board-table';
import { DocumentHub, type ProjectDocument } from '@/components/document-hub';
import { DiscordPanel } from '@/components/discord-panel';
import type { Task } from '@taskforge/shared';

type Tab = 'table' | 'documents';

export function ProjectViewClient({
  projectId,
  projectName,
  orgId,
  orgName,
  connectCode,
  boardId,
  initialTasks,
  userId,
  initialDocs,
}: {
  projectId: string;
  projectName: string;
  orgId: string;
  orgName: string;
  connectCode: string | null;
  boardId: string;
  initialTasks: Task[];
  userId: string;
  initialDocs: ProjectDocument[];
}) {
  const [tab, setTab] = useState<Tab>('table');

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-txt-primary">{projectName}</h1>
          <DiscordPanel
            orgId={orgId}
            orgName={orgName}
            connectCode={connectCode}
            projectId={projectId}
            projectName={projectName}
          />
        </div>
        {/* View tabs */}
        <div className="mt-3 flex items-center gap-0.5 border-b border-monday-border">
          <button
            onClick={() => setTab('table')}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              tab === 'table'
                ? 'text-brand-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand-500 after:content-[""]'
                : 'text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Main Table
          </button>
          <button
            onClick={() => setTab('documents')}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              tab === 'documents'
                ? 'text-brand-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand-500 after:content-[""]'
                : 'text-txt-secondary hover:text-txt-primary'
            }`}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === 'table' && (
        <BoardTable
          boardId={boardId}
          orgId={orgId}
          initialTasks={initialTasks}
          userId={userId}
        />
      )}
      {tab === 'documents' && (
        <DocumentHub projectId={projectId} initialDocs={initialDocs} />
      )}
    </div>
  );
}
