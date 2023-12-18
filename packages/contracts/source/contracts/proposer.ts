import { CommitHandler } from "./crypto";

export interface ProposerSelector extends CommitHandler {
	getValidatorIndex(round: number): number;
}
