import { ICommittedBlock } from "./crypto";
import { IValidatorWallet } from "./state";

export interface IValidatorSet {
	initialize(): Promise<void>;
	handleCommitBlock(block: ICommittedBlock): Promise<void>;
	getActiveValidators(): IValidatorWallet[];
	getValidator(validatorIndex: number): IValidatorWallet;
	getValidatorIndexByWalletPublicKey(walletPublicKey: string): number;
}
