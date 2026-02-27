'use client';

import { useState } from 'react';
import { BoardTable } from '@/components/board-table';
import { DocumentHub, type ProjectDocument } from '@/components/document-hub';
import { DiscordPanel } from '@/components/discord-panel';
import type { Task } from '@taskforge/shared';

type Tab = 'table' | 'documents';

export function BoardViewClient({
  boardId,
  boardName,
  projectId,
  projectName,
  orgId,
  orgName,
  connectCode,
  initialTasks,
  userId,
  initialDocs,
}: {
  boardId: string;
  boardName: string;
  projectId: string;
  projectName: string;
  orgId: string;
  orgName: string;
  connectCode: string | null;
  initialTasks: Task[];
  userId: string;
  initialDocs: ProjectDocument[];
}) {
  const [tab, setTab] = useState<Tab>('table');

  return (
    <div>
      {/* Breadcrumb */}
        <div className="mb-1 flex items-center gap-1.5 text-[13px] text-txt-secondary dark:text-zinc-400">
        <span>{orgName}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="stroke-current opacity-50"
        >
          <path
            d="M4.5 2.5l3 3.5-3 3.5"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{projectName}</span>
      </div>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-txt-primary dark:text-zinc-100">{boardName}</h1>
          <DiscordPanel
            orgId={orgId}
            orgName={orgName}
            connectCode={connectCode}
            projectId={projectId}
            projectName={projectName}
          />
        </div>
        {/* View tabs */}
        <div className="mt-3 flex items-center gap-0.5 border-b border-monday-border dark:border-zinc-700">
          <button
            onClick={() => setTab('table')}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              tab === 'table'
                ? 'text-brand-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand-500 after:content-[""] dark:text-brand-400'
                : 'text-txt-secondary hover:text-txt-primary dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Main Table
          </button>
          <button
            onClick={() => setTab('documents')}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              tab === 'documents'
                ? 'text-brand-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-brand-500 after:content-[""] dark:text-brand-400'
                : 'text-txt-secondary hover:text-txt-primary dark:text-zinc-400 dark:hover:text-zinc-100'
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
