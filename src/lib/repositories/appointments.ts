import { getStoreKind } from '@/lib/datastore';
import type { Appointment } from '@/lib/types';

export interface AppointmentsRepository {
  list(): Promise<Appointment[]>;
}

export function getAppointmentsRepository(): AppointmentsRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    const mod = require('./tcb/appointments');
    return mod.createTcbAppointmentsRepository();
  }
  const jsonMod = require('./json/appointments');
  return jsonMod.createJsonAppointmentsRepository();
}
