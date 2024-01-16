import { CommitHandler } from "./crypto";

export interface Selector extends CommitHandler {
	getValidatorIndex(round: number): number;
}
