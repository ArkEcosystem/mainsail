import { CommitHandler } from "./crypto/commit.js";
import { ValidatorWallet } from "./state/index.js";

export interface Service extends CommitHandler {
	restore(): Promise<void>;
	getActiveValidators(): ValidatorWallet[];
	getAllValidators(): ValidatorWallet[];
	getDirtyValidators(): ValidatorWallet[];
	getValidator(validatorIndex: number): ValidatorWallet;
	getValidatorIndexByWalletAddress(walletAddress: string): number;
}
