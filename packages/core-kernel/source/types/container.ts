export type Constructor<T = {}> = new (...arguments_: any[]) => T;

export type FunctionReturning<T> = (...arguments_: Array<any>) => T;

export type ClassOrFunctionReturning<T> = FunctionReturning<T> | Constructor<T>;
