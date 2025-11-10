
import type { User as AppUser } from '@/lib/types';
import type { Role } from '@/lib/shared-types';

// This function will dynamically initialize and return the correct auth implementation.
const getAuthImplementation = async () => {
    // NEXT_PUBLIC_USE_TCB_AUTH is expected to be set to 'true' in the production environment.
    if (process.env.NEXT_PUBLIC_USE_TCB_AUTH === 'true') {
        console.log("Auth Service: Using TCB implementation.");
        const { tcbAuth } = await import('./auth-tcb');
        return tcbAuth;
    }
    console.log("Auth Service: Using Firebase implementation.");
    const { firebaseAuth } = await import('./auth-firebase');
    return firebaseAuth;
};

// Define the unified interface for our auth service.
export interface AuthService {
    onAuthStateChanged(callback: (user: AppUser | null, role: Role | null) => void): () => void;
    loginWithEmail(email: string, pass: string): Promise<any>;
    signupWithEmail(email: string, pass: string): Promise<any>;
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

    async onAuthStateChanged(callback: (user: AppUser | null, role: Role | null) => void): Promise<() => void> {
        const service = await this.getService();
        return service.onAuthStateChanged(callback);
    }

    async loginWithEmail(email: string, pass: string): Promise<any> {
        const service = await this.getService();
        return service.loginWithEmail(email, pass);
    }

    async signupWithEmail(email: string, pass: string): Promise<any> {
        const service = await this.getService();
        return service.signupWithEmail(email, pass);
    }

    async logout(): Promise<void> {
        const service = await this.getService();
        return service.logout();
    }
}

export const auth = new AuthProxy();
