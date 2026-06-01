import type { IEventBus } from '@argos-wallet/types';

type Listener = (...args: unknown[]) => void;

export class EventBus implements IEventBus {
  private listeners = new Map<string, Set<Listener>>();

  emit<T = unknown>(event: string, data: T): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch {
          // Swallow listener errors to prevent cascade failures
        }
      }
    }
  }

  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback as Listener);
    return () => {
      set.delete(callback as Listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
