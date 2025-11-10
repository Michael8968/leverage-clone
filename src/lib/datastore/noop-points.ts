// No-op PointsStore for development environments without a backend.
import type { PointsStore } from './types';

export function createNoopPointsStore(): PointsStore {
  return {
    async getBalance(_userId: string) {
      return 0;
    },
    async deduct(_userId: string, _amount: number, _reason: string) {
      // Intentionally no-op
      return;
    },
  };
}
