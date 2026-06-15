import { Fake } from "./fake.js";

export class Spy<TArguments extends unknown[] = unknown[], TResult = unknown> extends Fake<TArguments, TResult> {}
