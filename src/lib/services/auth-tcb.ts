
import type { User as AppUser } from '@/lib/types';
import type { Role } from '@/lib/shared-types';
import type { AuthService } from './auth';

const JWT_TOKEN_KEY = 'jwt_auth_token';

class TcbAuth implements AuthService {
    private _listeners: ((user: AppUser | null, role: Role | null) => void)[] = [];
    private _currentUser: AppUser | null = null;
    private _currentRole: Role | null = null;
    private _isInitialized = false;

    constructor() {
        this.init();
    }

    private async init() {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem(JWT_TOKEN_KEY);
        if (token) {
            try {
                // This API route should validate the token and return the user.
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const { user } = await response.json();
                    this.updateUserState(user);
                } else {
                    // Token is invalid or expired.
                    this.updateUserState(null);
                    localStorage.removeItem(JWT_TOKEN_KEY);
                }
            } catch (error) {
                console.error("Error validating token:", error);
                this.updateUserState(null);
            }
        } else {
            this.updateUserState(null);
        }
        
        this._isInitialized = true;
    }

    private updateUserState(user: AppUser | null) {
        this._currentUser = user;
        this._currentRole = user ? user.role || 'user' : null;
        this.notifyListeners();
    }

    private notifyListeners() {
        this._listeners.forEach(cb => cb(this._currentUser, this._currentRole));
    }

    onAuthStateChanged(callback: (user: AppUser | null, role: Role | null) => void): () => void {
        this._listeners.push(callback);
        if (this._isInitialized) {
            callback(this._currentUser, this._currentRole);
        }

        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    }

    async loginWithEmail(email: string, pass: string): Promise<any> {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
        }

        const { token, user } = await response.json();
        localStorage.setItem(JWT_TOKEN_KEY, token);
        this.updateUserState(user);
    }

    async signupWithEmail(email: string, pass: string): Promise<any> {
         const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Signup failed');
        }

        const { token, user } = await response.json();
        localStorage.setItem(JWT_TOKEN_KEY, token);
        this.updateUserState(user);
    }

    async logout(): Promise<void> {
        localStorage.removeItem(JWT_TOKEN_KEY);
        this.updateUserState(null);
    }
}

// Export a single instance of the class
export const tcbAuth = new TcbAuth();
