import type { CommitHandler } from "./crypto/commit-handler.js";
import type { ValidatorWallet } from "./state/index.js";

export interface Service extends CommitHandler {
	restore(): Promise<void>;
	getRoundValidators(): ValidatorWallet[];
	getAllValidators(): ValidatorWallet[];
	getDirtyValidators(): ValidatorWallet[];
	getValidator(validatorIndex: number): ValidatorWallet;
	getValidatorIndexByWalletAddress(walletAddress: string): number;
}
