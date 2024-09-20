import { CommitHandler } from "./crypto/commit.js";
import { Store, ValidatorWalletOld } from "./state/index.js";

export interface Service extends CommitHandler {
	restore(store: Store): Promise<void>;
	getActiveValidators(): ValidatorWalletOld[];
	getValidator(validatorIndex: number): ValidatorWalletOld;
	getValidatorIndexByWalletAddress(walletAddress: string): number;
}
