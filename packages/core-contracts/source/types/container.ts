export type Constructor<T = {}> = new (...args: any[]) => T;

export type FunctionReturning<T> = (...args: Array<any>) => T;

export type ClassOrFunctionReturning<T> = FunctionReturning<T> | Constructor<T>;
