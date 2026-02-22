'use client';

import { useState } from 'react';

interface DiscordPanelProps {
  orgId: string;
  orgName: string;
  connectCode: string | null;
  projectId: string;
  projectName: string;
}

function CopyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-txt-secondary">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <div
          className={`flex-1 truncate rounded-md border border-monday-border bg-surface px-3 py-1.5 text-sm ${
            mono ? 'font-mono' : ''
          } text-txt-primary`}
        >
          {value}
        </div>
        <button
          onClick={handleCopy}
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border transition ${
            copied
              ? 'border-status-green bg-status-green/10 text-status-green'
              : 'border-monday-border bg-white text-txt-secondary hover:bg-gray-50 hover:text-txt-primary'
          }`}
          title="Copy"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
              <path d="M2.5 7.5L5.5 10.5L11.5 3.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
              <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" strokeWidth="1.3" />
              <path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" strokeWidth="1.3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-txt-secondary">
        {label}
      </label>
      <div className="group relative rounded-md border border-monday-border bg-[#2B2D31] px-4 py-2.5">
        <code className="block break-all text-[13px] text-[#DBDEE1]">{command}</code>
        <button
          onClick={handleCopy}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded transition ${
            copied
              ? 'bg-status-green/20 text-status-green'
              : 'bg-white/10 text-white/50 opacity-0 hover:text-white group-hover:opacity-100'
          }`}
          title="Copy command"
        >
          {copied ? (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="stroke-current">
              <path d="M2.5 7.5L5.5 10.5L11.5 3.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="stroke-current">
              <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" strokeWidth="1.5" />
              <path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" strokeWidth="1.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export function DiscordPanel({
  orgId,
  orgName,
  connectCode,
  projectId,
  projectName,
}: DiscordPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-[32px] items-center gap-1.5 rounded-md bg-[#5865F2] px-3 text-[13px] font-medium text-white transition hover:bg-[#4752C4]"
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M13.55 1.01A13.3 13.3 0 0010.3 0a.05.05 0 00-.05.02c-.14.25-.3.58-.41.84a12.3 12.3 0 00-3.68 0A8.5 8.5 0 005.74.02.05.05 0 005.7 0a13.27 13.27 0 00-3.26 1.01.04.04 0 00-.02.02C.36 4.2-.22 7.3.07 10.36a.05.05 0 00.02.04 13.38 13.38 0 004.02 2.03.05.05 0 00.06-.02c.31-.42.59-.87.83-1.34a.05.05 0 00-.03-.07 8.8 8.8 0 01-1.26-.6.05.05 0 01-.005-.083c.08-.06.17-.13.25-.2a.05.05 0 01.05-.006c2.65 1.21 5.52 1.21 8.13 0a.05.05 0 01.05.01c.08.06.17.13.25.19a.05.05 0 01-.004.084 8.3 8.3 0 01-1.26.6.05.05 0 00-.03.07c.24.47.52.92.83 1.34a.05.05 0 00.05.02 13.33 13.33 0 004.03-2.03.05.05 0 00.02-.04c.34-3.53-.57-6.6-2.43-9.32a.04.04 0 00-.02-.02zM5.34 8.5c-.81 0-1.47-.74-1.47-1.65s.65-1.65 1.47-1.65c.83 0 1.49.75 1.47 1.65 0 .91-.65 1.65-1.47 1.65zm5.32 0c-.81 0-1.47-.74-1.47-1.65s.65-1.65 1.47-1.65c.83 0 1.49.75 1.47 1.65 0 .91-.64 1.65-1.47 1.65z" />
        </svg>
        Discord Setup
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-monday-border bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-monday-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2]">
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
                    <path d="M13.55 1.01A13.3 13.3 0 0010.3 0a.05.05 0 00-.05.02c-.14.25-.3.58-.41.84a12.3 12.3 0 00-3.68 0A8.5 8.5 0 005.74.02.05.05 0 005.7 0a13.27 13.27 0 00-3.26 1.01.04.04 0 00-.02.02C.36 4.2-.22 7.3.07 10.36a.05.05 0 00.02.04 13.38 13.38 0 004.02 2.03.05.05 0 00.06-.02c.31-.42.59-.87.83-1.34a.05.05 0 00-.03-.07 8.8 8.8 0 01-1.26-.6.05.05 0 01-.005-.083c.08-.06.17-.13.25-.2a.05.05 0 01.05-.006c2.65 1.21 5.52 1.21 8.13 0a.05.05 0 01.05.01c.08.06.17.13.25.19a.05.05 0 01-.004.084 8.3 8.3 0 01-1.26.6.05.05 0 00-.03.07c.24.47.52.92.83 1.34a.05.05 0 00.05.02 13.33 13.33 0 004.03-2.03.05.05 0 00.02-.04c.34-3.53-.57-6.6-2.43-9.32a.04.04 0 00-.02-.02zM5.34 8.5c-.81 0-1.47-.74-1.47-1.65s.65-1.65 1.47-1.65c.83 0 1.49.75 1.47 1.65 0 .91-.65 1.65-1.47 1.65zm5.32 0c-.81 0-1.47-.74-1.47-1.65s.65-1.65 1.47-1.65c.83 0 1.49.75 1.47 1.65 0 .91-.64 1.65-1.47 1.65z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-txt-primary">Discord Setup</h2>
                  <p className="text-xs text-txt-secondary">
                    Connect your Discord server to {projectName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-txt-secondary transition hover:bg-gray-100 hover:text-txt-primary"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                  <path d="M2 2l10 10M12 2L2 12" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 p-6">
              {/* Step 1 */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-txt-primary">
                    Connect your Discord server to {orgName}
                  </h3>
                </div>
                <div className="ml-7 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <CopyField label="Organization ID" value={orgId} mono />
                    <CopyField label="Connect Code" value={connectCode ?? 'N/A'} mono />
                  </div>
                  <CommandBlock
                    label="Run in Discord"
                    command={`/connect org_id:${orgId} connect_code:${connectCode ?? '???'}`}
                  />
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-txt-primary">
                    Link a channel to this project
                  </h3>
                </div>
                <div className="ml-7 space-y-2.5">
                  <CopyField label="Project ID" value={projectId} mono />
                  <CommandBlock
                    label="Run in the channel you want to link"
                    command={`/link_channel project_id:${projectId}`}
                  />
                </div>
              </div>

              {/* How it works */}
              <div className="rounded-lg bg-surface p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-secondary">
                  Once linked
                </h4>
                <ul className="space-y-1.5 text-[13px] text-txt-secondary">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-status-blue">&#9679;</span>
                    Messages in the channel automatically become tasks
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-status-green">&#9679;</span>
                    React with a checkmark to mark a task as done
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-status-orange">&#9679;</span>
                    Use keywords like <code className="rounded bg-white px-1 text-xs">urgent</code>{' '}
                    or <code className="rounded bg-white px-1 text-xs">due 2026-03-01</code> for priority/dates
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
