type EventHandler = (error: Error) => void;

class ErrorEmitter {
  private listeners: { [event: string]: EventHandler[] } = {};

  on(event: string, listener: EventHandler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: EventHandler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, error: Error) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => listener(error));
  }
}

export const errorEmitter = new ErrorEmitter();
