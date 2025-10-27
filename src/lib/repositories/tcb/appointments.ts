import type { AppointmentsRepository } from '@/lib/repositories/appointments';
import { getTcbDb } from '@/lib/tcb';

export function createTcbAppointmentsRepository(): AppointmentsRepository {
  return {
    async list() {
      const db = getTcbDb();
      const res = await db.collection('appointments').get();
      return res?.data || [];
    },
  };
}
