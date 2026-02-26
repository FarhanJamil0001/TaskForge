/**
 * Yjs provider for Supabase Realtime - enables CRDT-based collaborative editing.
 * Adapted from supabase-community/y-supabase (not on npm).
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';

type SupabaseProviderOptions = {
  broadcastThrottleMs?: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  awareness?: boolean | Awareness;
};

type Status = 'connecting' | 'connected' | 'disconnected';

type RealtimeYPayload = {
  update: string;
  user: { id: string };
  timestamp: number;
};

const UPDATE_EVENT = 'y-supabase-update';
const STATE_VECTOR_EVENT = 'y-supabase-state-vector';
const AWARENESS_EVENT = 'y-supabase-awareness';

type StateVectorPayload = {
  stateVector: string;
  user: { id: string };
  timestamp: number;
};

function encodeUpdate(update: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < update.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(update.subarray(i, i + chunkSize)) as number[],
    );
  }
  return btoa(binary);
}

function decodeUpdate(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class SupabaseProvider {
  private channelName: string;
  private doc: Y.Doc;
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private status: Status = 'connecting';
  private userId: string;
  private broadcastTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingUpdates: Uint8Array[] = [];
  private options: SupabaseProviderOptions | undefined;
  private syncedPeers = new Set<string>();
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private _awareness: Awareness | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private boundBeforeUnload: (() => void) | null = null;
  private handleDocUpdate: (update: Uint8Array, origin: unknown) => void;
  private handleAwarenessUpdate: (arg: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => void;

  constructor(
    channelName: string,
    doc: Y.Doc,
    supabase: SupabaseClient,
    options?: SupabaseProviderOptions,
  ) {
    this.channelName = channelName;
    this.doc = doc;
    this.supabase = supabase;
    this.options = options;
    this.userId = crypto.randomUUID();

    if (options?.awareness) {
      this._awareness =
        options.awareness instanceof Awareness
          ? options.awareness
          : new Awareness(doc);
      this.handleAwarenessUpdate = this.handleAwarenessUpdateFn.bind(this);
      this._awareness.on('update', this.handleAwarenessUpdate);
    } else {
      this.handleAwarenessUpdate = () => {};
    }

    this.handleDocUpdate = this.handleDocUpdateFn.bind(this);

    if (typeof window !== 'undefined') {
      this.boundBeforeUnload = () => this.destroy();
      window.addEventListener('beforeunload', this.boundBeforeUnload);
    }

    this.connect();
  }

  on<K extends keyof ProviderEventMap>(
    event: K,
    listener: ProviderEventMap[K],
  ): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof ProviderEventMap>(
    event: K,
    listener: ProviderEventMap[K],
  ): this {
    this.listeners.get(event)?.delete(listener as (...args: unknown[]) => void);
    return this;
  }

  private emit<K extends keyof ProviderEventMap>(
    event: K,
    ...args: Parameters<ProviderEventMap[K]>
  ): void {
    this.listeners.get(event)?.forEach((listener) => {
      (listener as (...a: unknown[]) => void)(...args);
    });
  }

  private setStatus(next: Status): void {
    this.status = next;
    this.emit('status', next);
  }

  private broadcastUpdate(update: Uint8Array, event = UPDATE_EVENT): void {
    if (!this.channel) return;

    const payload: RealtimeYPayload = {
      update: encodeUpdate(update),
      user: { id: this.userId },
      timestamp: Date.now(),
    };

    this.channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  private queueBroadcast(update: Uint8Array): void {
    const throttle = this.options?.broadcastThrottleMs ?? 0;

    if (throttle <= 0) {
      this.broadcastUpdate(update);
      return;
    }

    this.pendingUpdates.push(update);

    if (this.broadcastTimeout) return;

    this.broadcastTimeout = setTimeout(() => {
      this.broadcastTimeout = null;
      if (this.pendingUpdates.length === 0) return;

      const mergedUpdate =
        this.pendingUpdates.length === 1
          ? this.pendingUpdates[0]
          : Y.mergeUpdates(this.pendingUpdates);
      this.pendingUpdates = [];
      this.broadcastUpdate(mergedUpdate);
    }, throttle);
  }

  private handleDocUpdateFn(update: Uint8Array, origin: unknown): void {
    if (origin === 'remote') return;
    this.queueBroadcast(update);
  }

  private handleRemoteUpdate(payload: RealtimeYPayload): void {
    if (payload.user.id === this.userId) return;

    try {
      const update = decodeUpdate(payload.update);
      Y.applyUpdate(this.doc, update, 'remote');
      this.emit('message', update);
    } catch (err) {
      this.emit(
        'error',
        err instanceof Error ? err : new Error('Failed to apply remote update'),
      );
    }
  }

  private broadcastAwarenessUpdate(update: Uint8Array): void {
    if (!this.channel || !this._awareness) return;

    const payload: RealtimeYPayload = {
      update: encodeUpdate(update),
      user: { id: this.userId },
      timestamp: Date.now(),
    };

    this.channel.send({
      type: 'broadcast',
      event: AWARENESS_EVENT,
      payload,
    });
  }

  private handleAwarenessUpdateFn(arg: {
    added: number[];
    updated: number[];
    removed: number[];
  }): void {
    if (!this._awareness) return;

    const update = encodeAwarenessUpdate(this._awareness, [
      ...arg.added,
      ...arg.updated,
      ...arg.removed,
    ]);
    this.broadcastAwarenessUpdate(update);
  }

  private handleRemoteAwareness(payload: RealtimeYPayload): void {
    if (!this.awareness) return;
    if (payload.user.id === this.userId) return;

    try {
      const update = decodeUpdate(payload.update);
      if (this._awareness) applyAwarenessUpdate(this._awareness, update, 'remote');
      this.emit('awareness', update);
    } catch (err) {
      this.emit(
        'error',
        err instanceof Error
          ? err
          : new Error('Failed to apply awareness update'),
      );
    }
  }

  private sendStateVector(): void {
    if (!this.channel) return;

    const stateVector = Y.encodeStateVector(this.doc);
    const payload: StateVectorPayload = {
      stateVector: encodeUpdate(stateVector),
      user: { id: this.userId },
      timestamp: Date.now(),
    };

    this.channel.send({
      type: 'broadcast',
      event: STATE_VECTOR_EVENT,
      payload,
    });
  }

  private handleStateVector(payload: StateVectorPayload): void {
    if (payload.user.id === this.userId) return;
    if (this.syncedPeers.has(payload.user.id)) return;
    this.syncedPeers.add(payload.user.id);

    try {
      const remoteStateVector = decodeUpdate(payload.stateVector);
      const diff = Y.encodeStateAsUpdate(this.doc, remoteStateVector);

      if (diff.length > 2) {
        this.broadcastUpdate(diff);
      }
      this.sendStateVector();
    } catch (err) {
      this.emit(
        'error',
        err instanceof Error
          ? err
          : new Error('Failed to handle state vector'),
      );
    }
  }

  connect(): void {
    this.shouldReconnect = true;
    this.doc.off('update', this.handleDocUpdate);
    this.doc.on('update', this.handleDocUpdate);
    this.syncedPeers.clear();

    const channel = this.supabase.channel(this.channelName);

    channel
      .on(
        'broadcast',
        { event: STATE_VECTOR_EVENT },
        (data: { payload: StateVectorPayload }) => {
          this.handleStateVector(data.payload);
        },
      )
      .on(
        'broadcast',
        { event: UPDATE_EVENT },
        (data: { payload: RealtimeYPayload }) => {
          this.handleRemoteUpdate(data.payload);
        },
      )
      .on(
        'broadcast',
        { event: AWARENESS_EVENT },
        (data: { payload: RealtimeYPayload }) => {
          this.handleRemoteAwareness(data.payload);
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected');
          this.emit('connect', this);
          this.reconnectAttempts = 0;

          if (this._awareness) {
            const update = encodeAwarenessUpdate(
              this._awareness,
              Array.from(this._awareness.getStates().keys()),
            );
            this.broadcastAwarenessUpdate(update);
          }

          this.sendStateVector();
        } else if (status === 'CHANNEL_ERROR') {
          this.setStatus('disconnected');
          this.emit('error', err ?? new Error('Channel error'));
          this.emit('disconnect', this);
          this.scheduleReconnect();
        } else if (status === 'TIMED_OUT') {
          this.setStatus('disconnected');
          this.emit('error', new Error('Connection timed out'));
          this.emit('disconnect', this);
          this.scheduleReconnect();
        } else if (status === 'CLOSED') {
          this.setStatus('disconnected');
          this.emit('disconnect', this);
          this.scheduleReconnect();
        }
      });

    this.channel = channel;
  }

  private scheduleReconnect(): void {
    const autoReconnect = this.options?.autoReconnect ?? true;
    const maxAttempts = this.options?.maxReconnectAttempts ?? Infinity;

    if (
      !autoReconnect ||
      !this.shouldReconnect ||
      this.reconnectAttempts >= maxAttempts
    ) {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const baseDelay = this.options?.reconnectDelay ?? 1000;
    const maxDelay = this.options?.maxReconnectDelay ?? 30000;
    const delay = Math.min(
      baseDelay * Math.pow(2, this.reconnectAttempts),
      maxDelay,
    );

    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  destroy(): void {
    this.shouldReconnect = false;

    if (this.broadcastTimeout) {
      clearTimeout(this.broadcastTimeout);
      this.broadcastTimeout = null;
    }

    if (this.pendingUpdates.length > 0) {
      const mergedUpdate =
        this.pendingUpdates.length === 1
          ? this.pendingUpdates[0]
          : Y.mergeUpdates(this.pendingUpdates);
      this.pendingUpdates = [];
      this.broadcastUpdate(mergedUpdate);
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.boundBeforeUnload && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.boundBeforeUnload);
      this.boundBeforeUnload = null;
    }

    this.doc.off('update', this.handleDocUpdate);

    if (this._awareness) {
      removeAwarenessStates(this._awareness, [this.doc.clientID], 'local');
      this._awareness.off('update', this.handleAwarenessUpdate);
    }

    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  getStatus(): Status {
    return this.status;
  }

  getAwareness(): Awareness | null {
    return this._awareness;
  }

  /** Alias for CollaborationCaret compatibility - expects provider.awareness */
  get awareness(): Awareness | null {
    return this._awareness;
  }
}

type ProviderEventMap = {
  message: (update: Uint8Array) => void;
  awareness: (update: Uint8Array) => void;
  status: (status: Status) => void;
  connect: (provider: SupabaseProvider) => void;
  disconnect: (provider: SupabaseProvider) => void;
  error: (error: Error) => void;
};
