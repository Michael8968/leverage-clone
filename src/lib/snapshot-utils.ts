// Utility helpers for handling snapshot shapes coming from cloudbase-compat or Firebase
export function snapshotExists(snap: any): boolean {
  if (!snap) return false;
  try {
    if (typeof snap.exists === 'function') return snap.exists();
    return !!snap.exists;
  } catch (e) {
    return false;
  }
}

export function snapshotData<T = any>(snap: any): T | null {
  if (!snapshotExists(snap)) return null;
  try {
    return typeof snap.data === 'function' ? snap.data() : snap.data;
  } catch (e) {
    return null;
  }
}
