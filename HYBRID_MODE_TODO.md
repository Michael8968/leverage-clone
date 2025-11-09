
# Hybrid Mode Integration Plan (Frontend: Firebase, Backend: TCB)

This document outlines the plan to refactor the `leverage-clone-temp` project to support a hybrid development model. The goal is to allow frontend development using the Firebase SDK (specifically for Auth) while the backend and production environment run entirely on TCB.

---

## Migration Task Checklist (TODO List 2.0)

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

---
**Legend:**
-   ⬜: To-Do
-   🟡: In Progress
-   ✅: Completed
