
# Hybrid Mode Integration Plan (Frontend: Firebase, Backend: TCB)

This document outlines the plan to refactor the `leverage-clone-temp` project to support a hybrid development model. The goal is to allow frontend development using the Firebase SDK (specifically for Auth) while the backend and production environment run entirely on TCB.

---

## Migration Task Checklist (TODO List 3.0 - Updated)

### ✅ 0. Cloud Functions Migration (云函数迁移) - COMPLETED

- [x] **0.1. 实现所有19个云函数业务逻辑:**
    -   **已完成:** 所有核心业务函数和AI功能函数已实现
    -   **技术栈:** Node.js 18.15 + @cloudbase/node-sdk
    -   **功能覆盖:** 需求管理、AI服务、3D生成、媒体处理等

- [x] **0.2. 云函数部署和配置:**
    -   **已完成:** 所有函数已部署到TCB环境
    -   **依赖管理:** package.json配置完成
    -   **错误处理:** 统一错误处理机制实现

### ⬜ 1. Restore Frontend Firebase Dependency

- [ ] **1.1. Add Firebase SDK to `package.json`:**
    -   **Task:** Add the `"firebase"` package to the project's dependencies.
    -   **Purpose:** Enable the use of the Firebase client-side SDK in the frontend code.
    -   **Command:** `npm install firebase --prefix leverage-clone-temp`

### ⬜ 2. Restore Frontend Firebase Configuration

- [ ] **2.1. Re-create Firebase Initialization File:**
    -   **Task:** Create a `src/lib/firebase.ts` file.
    -   **Content:** This file should contain the Firebase project configuration (apiKey, authDomain, etc.) for the **development-only** Firebase project.
    -   **Purpose:** To initialize the Firebase app on the client-side for developers.

### ⬜ 3. Refactor Core Authentication Logic

- [ ] **3.1. Implement Dual-Track Authentication in `src/store/auth.ts`:**
    -   **Task:** Modify the authentication store to handle two different login flows.
    -   **Development Flow (`NODE_ENV === 'development'`):**
        1.  Use Firebase SDK (`signInWith...`) for user authentication on the frontend.
        2.  After a successful Firebase login, send the resulting Firebase `idToken` to a new TCB backend endpoint.
    -   **Production Flow (`NODE_ENV === 'production'`):**
        1.  Use the existing TCB authentication API directly.
- [ ] **3.2. Create TCB Endpoint for Firebase Token Sync:**
    -   **Task:** Create a new API route/cloud function (e.g., `POST /api/auth/firebase-sync`).
    -   **Logic:**
        1.  Receives a Firebase `idToken` from the frontend.
        2.  Uses TCB's admin capabilities (or a corresponding SDK) to verify the Firebase `idToken`.
        3.  Creates or finds a corresponding user in the TCB user database.
        4.  Returns a valid TCB session token to the frontend.
    -   **Purpose:** To bridge the Firebase dev-auth with the TCB production-auth system.

### ⬜ 4. Adapt Frontend Auth Provider

- [ ] **4.1. Update `AuthProvider` Component:**
    -   **Task:** Modify `src/components/providers/auth-provider.tsx`.
    -   **Logic:** Ensure the provider correctly manages the user's session state, which will now be based on the TCB session token received from the backend, regardless of the initial login method.

### ⬜ 5. Configure Environment Variables

- [ ] **5.1. Update Environment Files:**
    -   **Task:** Add the necessary `NEXT_PUBLIC_FIREBASE_*` variables to `.env.local` for the frontend.
    -   **Task:** Ensure the TCB backend environment has the necessary secrets/keys to validate Firebase tokens.

### ⬜ 6. Database and Services Setup (数据库和服务配置)

- [ ] **6.1. Initialize TCB Database Collections:**
    -   **Task:** Create all required collections in TCB database
    -   **Collections:** demands, users, llm_connections, demand_clarifications, tripo3d_tasks, etc.
    -   **Purpose:** Set up the database schema for production

- [ ] **6.2. Configure LLM Service Connections:**
    -   **Task:** Set up AI service API keys and configurations
    -   **Services:** OpenAI, Gemini, Tencent Hunyuan
    -   **Purpose:** Enable AI-powered features in production

- [ ] **6.3. Set up HTTP Triggers:**
    -   **Task:** Configure SCF API Gateway for HTTP access
    -   **Purpose:** Enable external API calls to cloud functions

### ⬜ 7. Firebase to TCB Migration (Firebase迁移至TCB)

- [ ] **7.1. Data Migration Strategy:**
    -   **Task:** Plan and execute data migration from Firebase to TCB
    -   **Components:** User data, demands, LLM connections, historical data
    -   **Tools:** Custom migration scripts, data validation

- [ ] **7.2. Authentication System Migration:**
    -   **Task:** Migrate Firebase Auth users to TCB authentication
    -   **Strategy:** User mapping, password migration, session handling
    -   **Testing:** Login flow validation across both systems

- [ ] **7.3. Storage Migration:**
    -   **Task:** Migrate Firebase Storage files to TCB Storage
    -   **Components:** User uploads, generated content, media files
    -   **Process:** Batch migration with integrity checks

- [ ] **7.4. Frontend Code Adaptation:**
    -   **Task:** Update frontend to work with both Firebase (dev) and TCB (prod)
    -   **Changes:** SDK imports, API endpoints, authentication flows
    -   **Testing:** Environment-specific functionality

- [ ] **7.5. Environment Configuration:**
    -   **Task:** Set up environment-specific configurations
    -   **Files:** .env files, build configurations, deployment scripts
    -   **Validation:** Environment detection and switching logic

### ⬜ 8. Testing and Validation (测试与验证)

- [ ] **8.1. End-to-End Testing:**
    -   **Task:** Test complete user workflows in production environment
    -   **Coverage:** Registration, login, demand creation, AI features

- [ ] **8.2. Performance Testing:**
    -   **Task:** Load testing and performance benchmarking
    -   **Metrics:** Response times, error rates, scalability

- [ ] **8.3. Security Audit:**
    -   **Task:** Security testing and vulnerability assessment
    -   **Focus:** API security, data protection, authentication

### ⬜ 9. Deployment and Monitoring (部署与监控)

- [ ] **9.1. Production Deployment:**
    -   **Task:** Deploy complete application to production
    -   **Checklist:** Environment setup, data migration, DNS configuration

- [ ] **9.2. Monitoring Setup:**
    -   **Task:** Implement logging, alerting, and performance monitoring
    -   **Tools:** CloudWatch, custom dashboards, error tracking

- [ ] **9.3. Rollback Plan:**
    -   **Task:** Prepare contingency plans and rollback procedures
    -   **Purpose:** Ensure business continuity

---
**Legend:**
-   ⬜: To-Do
-   🟡: In Progress
-   ✅: Completed

**Current Status:**
- **Cloud Functions:** ✅ 19/19 completed
- **Frontend Integration:** ⬜ 0/5 completed
- **Database Setup:** ⬜ 0/3 completed
- **Migration Tasks:** ⬜ 0/5 completed
- **Testing:** ⬜ 0/3 completed
- **Deployment:** ⬜ 0/3 completed

**Next Priority:** Complete database setup and LLM configuration to enable production testing, followed by Firebase to TCB migration tasks.
