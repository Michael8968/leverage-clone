import type { AppointmentsRepository } from '@/lib/repositories/appointments';

export function createJsonAppointmentsRepository(): AppointmentsRepository {
  return {
    async list() {
      // 没有本地数据文件时，回退为空列表
      return [];
    },
  };
}
