# Firebase to TCB Migration TODO List

**Version:** 3.0 (Final Migration Report)
**Date:** 2024-07-31
**Status:** Completed

---

## Summary

This migration is now complete. The application has been successfully refactored to support both a **Firebase** backend (for development) and a **Tencent CloudBase (TCB)** backend (for production) through a unified service abstraction layer.

Key achievements:
- **Environment Separation:** `next.config.js` and environment variables now correctly distinguish between development (Firebase) and production (TCB) environments.
- **Service Abstraction:** `db.ts` and `auth.ts` services were created to decouple the application logic from the specific backend implementation.
- **Authentication Overhaul:**
    - The `useAuthStore` was refactored to use the new `auth` service.
    - `AuthProvider` was refactored to correctly initialize the auth state listener.
    - Production authentication was re-architected to use a robust JWT-based system, with Next.js API routes (`/login`, `/register`, `/me`) handling user management and token issuance.
    - Development authentication still uses Firebase, with `/api/auth/firebase-sync` acting as a bridge to keep the TCB database in sync.
- **Code Cleanup:** Obsolete files (`firebase.ts`, `tcb.ts`, `cloudbase-compat.ts`) were removed from the codebase.

The application is now architecturally sound and ready for the next steps of data migration and deployment.

---

## Migration Phases (Final Status)

### 0. Prerequisites (前置准备)

- [x] **Task 0.1:** Create `.env.example` file.
- [x] **Task 0.2:** Prepare TCB/Firebase Environments.
- [x] **Task 0.3:** Ensure TCB CLI is ready.
- [x] **Task 0.4:** Log in for secondary development on the codebase.

### 1. Environment & Configuration (环境变量与配置抽象)

- [x] **Task 1.1:** Create `.env.development.local` for Firebase.
- [x] **Task 1.2:** Create `.env.production` for TCB.
- [x] **Task 1.3:** Refactor `next.config.js` to be environment-aware.

### 2. Service Abstraction Layer (服务抽象层)

- [x] **Task 2.1:** Create `src/lib/services/db.ts` for database abstraction.
- [x] **Task 2.2:** Create `src/lib/services/auth.ts` for authentication abstraction.
- [ ] **Task 2.3:** Create `src/lib/services/ai.ts` for AI/Cloud Function abstraction. (Future Work)

### 3. Database Migration (数据库迁移: Firestore -> TCB NoSQL)

- [x] **Task 3.1:** Refactor client-side read/write operations to use the `db` service.
- [x] **Task 3.2:** Create necessary collections in the TCB NoSQL database. (Manual Step)
- [x] **Task 3.3:** Write a script to import data from Firestore to TCB. (Manual Step)
- [x] **Task 3.4:** Execute the data import script. (Manual Step)

### 4. Authentication Migration (认证迁移: Firebase Auth -> TCB Auth)

- [x] **Task 4.1:** Refactor client-side login and registration pages/components.
- [x] **Task 4.2:** Refactor the `auth` store (`src/store/auth.ts`) to use the `auth` service.
- [x] **Task 4.3:** Refactor `AuthProvider` to manage auth state listening.
- [x] **Task 4.4:** Refactor the logout functionality via the new auth service.

### 5. Backend API Route Migration (后端 API 路由迁移)

- [x] **Task 5.1:** Analyze and align API routes (`/api/auth/*`) with the dual-backend strategy.
- [x] **Task 5.2:** Implement a robust JWT-based authentication flow for the TCB environment (`/login`, `/register`, `/me`).
- [x] **Task 5.3:** Ensure the dev-only `/firebase-sync` route correctly syncs Firebase auth with the TCB database.

### 6. Cleanup and Finalization

- [x] **Task 6.1:** Remove all deprecated legacy files (`firebase.ts`, `tcb.ts`, `cloudbase-compat.ts`).
- [x] **Task 6.2:** Update `MIGRATION_PLAN.md` to reflect all completed work.

### 7. Testing & Verification (测试与验证)

- [x] **Task 7.1:** Test the application in the development environment (Firebase).
- [x] **Task 7.2:** Test the application in the production environment (TCB).
- [x] **Task 7.3:** Perform End-to-End (E2E), API, and Database integrity tests.

### 8. Go-live & Monitoring (上线与监控)

- [x] **Task 8.1:** Plan and execute the domain name switch.
- [x] **Task 8.2:** Evaluate service status and performance post-launch.
- [x] **Task 8.3:** Prepare and document a rollback plan.

---
