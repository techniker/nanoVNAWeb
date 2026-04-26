export class TypedEmitter<EventMap extends Record<string, unknown>> {
  private handlers: { [K in keyof EventMap]?: Set<(payload: EventMap[K]) => void> } = {};

  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): () => void {
    const set = this.handlers[event] ?? new Set();
    set.add(handler);
    this.handlers[event] = set;
    return () => {
      set.delete(handler);
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.handlers[event];
    if (!set) return;
    for (const h of set) h(payload);
  }

  removeAllListeners(): void {
    this.handlers = {};
  }
}
