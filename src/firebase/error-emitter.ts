import { EventEmitter } from 'events';
import type { FirestorePermissionError } from './errors';

type AppEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// This is a typed event emitter.
class TypedEventEmitter extends EventEmitter {
  emit<E extends keyof AppEvents>(event: E, ...args: Parameters<AppEvents[E]>): boolean {
    return super.emit(event, ...args);
  }

  on<E extends keyof AppEvents>(event: E, listener: AppEvents[E]): this {
    return super.on(event, listener);
  }
}

// Export a singleton instance of the event emitter.
// This ensures that all parts of the application share the same event bus.
export const errorEmitter = new TypedEventEmitter();
