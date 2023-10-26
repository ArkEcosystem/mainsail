import { ICommitHandler } from "./crypto";
import { IValidatorWallet } from "./state";

export interface IValidatorSet extends ICommitHandler {
	initialize(): Promise<void>;
	getActiveValidators(height: number): IValidatorWallet[];
	getValidator(validatorIndex: number): IValidatorWallet;
	getValidatorIndexByWalletPublicKey(walletPublicKey: string): number;
}
