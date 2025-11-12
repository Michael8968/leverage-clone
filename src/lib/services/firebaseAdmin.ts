// Removed Firebase Admin; stub exports for legacy compatibility.
export function getFirebaseAdmin() { return { adminApp: null, initError: new Error('Firebase Admin removed') }; }
export function getAdminError() { return new Error('Firebase Admin removed'); }
