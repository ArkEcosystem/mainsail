import { ICommitHandler } from "./crypto";

export interface ProposerSelector extends ICommitHandler {
	getValidatorIndex(round: number): number;
}
