// A rich, structured error type for Firestore permission errors.

export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
    requestResourceData?: any;
};

const DENIED_MESSAGE = "FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:";

export class FirestorePermissionError extends Error {
    public readonly cause: SecurityRuleContext;

    constructor(context: SecurityRuleContext) {
        const message = `${DENIED_MESSAGE}\n${JSON.stringify(context, null, 2)}`;
        super(message);
        this.name = 'FirestorePermissionError';
        this.cause = context;

        // This is to make the error work correctly in modern TypeScript environments
        Object.setPrototypeOf(this, FirestorePermissionError.prototype);
    }
}
