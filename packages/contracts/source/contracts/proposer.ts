import { CommitHandler } from "./crypto/commit.js";

export interface Selector extends CommitHandler {
	getValidatorIndex(round: number): number;
}
