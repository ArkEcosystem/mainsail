import { ICommittedBlockHandler } from "./crypto";
import { IValidatorWallet } from "./state";

export interface IValidatorSet extends ICommittedBlockHandler {
	initialize(): Promise<void>;
	getActiveValidators(): IValidatorWallet[];
	getValidator(validatorIndex: number): IValidatorWallet;
	getValidatorIndexByWalletPublicKey(walletPublicKey: string): number;
}
