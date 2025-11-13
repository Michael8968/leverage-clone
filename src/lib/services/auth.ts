
import type { User as AppUser } from '@/lib/types';
import type { Role } from '@/lib/shared-types';

// This function will dynamically initialize and return the correct auth implementation.
const getAuthImplementation = async () => {
    // Firebase path removed; always use TCB implementation.
    if (process.env.NEXT_PUBLIC_USE_TCB_AUTH !== 'true') {
        console.warn('[Auth] NEXT_PUBLIC_USE_TCB_AUTH != true but Firebase removed. Falling back to TCB auth.');
    }
    const { tcbAuth } = await import('./auth-tcb');
    return tcbAuth;
};

// Define the unified interface for our auth service.
export interface AuthService {
    onAuthStateChanged(callback: (user: AppUser | null, role: Role | null) => void): () => void;
    loginWithEmail(email: string, pass: string): Promise<any>;
    // signupWithEmail now accepts an optional name parameter to satisfy backend requirements
    signupWithEmail(email: string, pass: string, name?: string): Promise<any>;
    logout(): Promise<void>;
}

// Create a proxy object that will delegate calls to the actual implementation.
class AuthProxy implements AuthService {
    private _authService: Promise<AuthService> | null = null;

    private getService(): Promise<AuthService> {
        if (!this._authService) {
            this._authService = getAuthImplementation();
        }
        return this._authService;
    }

    onAuthStateChanged(callback: (user: AppUser | null, role: Role | null) => void): () => void {
        // Return a temporary unsubscribe immediately to satisfy sync interface.
        let unsubscribe: () => void = () => {};
        this.getService()
            .then((service) => {
                // Attach real listener once implementation is ready.
                const realUnsub = service.onAuthStateChanged(callback);
                unsubscribe = () => {
                    try { realUnsub(); } catch {}
                };
            })
            .catch((err) => {
                console.warn('[Auth] Failed to initialize auth service:', err);
                // Fallback: emit null user once to clear state
                try { callback(null, null); } catch {}
            });
        return () => {
            try { unsubscribe(); } catch {}
        };
    }

    async loginWithEmail(email: string, pass: string): Promise<any> {
        const service = await this.getService();
        return service.loginWithEmail(email, pass);
    }

    async signupWithEmail(email: string, pass: string, name?: string): Promise<any> {
        const service = await this.getService();
        return service.signupWithEmail(email, pass, name);
    }

    async logout(): Promise<void> {
        const service = await this.getService();
        return service.logout();
    }
}

export const auth = new AuthProxy();
