import { ICommittedBlock } from "./crypto";
import { Wallet } from "./state";

export interface IValidatorSet {
	initialize(): Promise<void>;
	handleCommitBlock(block: ICommittedBlock): Promise<void>;
	getActiveValidators(): Wallet[];
	getValidatorPublicKeyByIndex(validatorIndex: number): string;
	getValidatorIndexByPublicKey(publicKey: string): number;
}
