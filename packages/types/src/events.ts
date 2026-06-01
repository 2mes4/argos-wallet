export type EventMap = Record<string, unknown[]>;

export interface IEventBus {
  emit<T = unknown>(event: string, data: T): void;
  on<T = unknown>(event: string, callback: (data: T) => void): () => void;
  off(event: string, callback: (...args: unknown[]) => void): void;
  removeAllListeners(event?: string): void;
}
