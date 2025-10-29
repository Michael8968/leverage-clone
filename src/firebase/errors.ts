export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const operation = context.operation.toUpperCase();
    const prettyData = context.requestResourceData
      ? `\nData: ${JSON.stringify(context.requestResourceData, null, 2)}`
      : '';

    const message = `Firestore Permission Denied: The ${operation} operation was denied on path '${context.path}'.${prettyData}`;
    
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is necessary for transitioning from a built-in Error to a custom one.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
