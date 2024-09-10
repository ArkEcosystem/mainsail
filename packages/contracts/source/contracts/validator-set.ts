import { CommitHandler } from "./crypto/commit.js";
import { Store, ValidatorWallet } from "./state/index.js";

export interface Service extends CommitHandler {
	restore(store: Store): Promise<void>;
	getActiveValidators(): ValidatorWallet[];
	getValidator(validatorIndex: number): ValidatorWallet;
	getValidatorIndexByWalletAddress(walletAddress: string): number;
}
