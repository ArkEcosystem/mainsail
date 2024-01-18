import { CommitHandler } from "./crypto";
import { Store, ValidatorWallet } from "./state";

export interface Service extends CommitHandler {
	restore(store: Store): void;
	getActiveValidators(): ValidatorWallet[];
	getValidator(validatorIndex: number): ValidatorWallet;
	getValidatorIndexByWalletPublicKey(walletPublicKey: string): number;
}
