import { ICommittedBlock } from "./crypto";
import { IValidatorWallet } from "./consensus";

export interface IValidatorSet {
	initialize(): Promise<void>;
	handleCommitBlock(block: ICommittedBlock): Promise<void>;
	getActiveValidators(): IValidatorWallet[];
	getValidatorConsensusPublicKeyByIndex(validatorIndex: number): string;
	getValidatorIndexByWalletPublicKey(walletPublicKey: string): number;
}
