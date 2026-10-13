export type FunctionReturning<Arguments extends unknown[] = unknown[], R = unknown> = (...arguments_: Arguments) => R;

export type Iteratee<T = unknown> = keyof T | FunctionReturning<[T], unknown>;
