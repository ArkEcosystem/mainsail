import { IValidatorWallet } from "./consensus";
import { ICommittedBlock } from "./crypto";

export interface IValidatorSet {
	initialize(): Promise<void>;
	handleCommitBlock(block: ICommittedBlock): Promise<void>;
	getActiveValidators(): IValidatorWallet[];
	getValidator(validatorIndex: number): IValidatorWallet;
	getValidatorIndexByWalletPublicKey(walletPublicKey: string): number;
}
