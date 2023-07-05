import { Wallet } from "./state";

export interface IValidatorSet {
	getActiveValidators(): Wallet[];
	getValidatorPublicKeyByIndex(validatorIndex: number): string;
	getValidatorIndexByPublicKey(publicKey: string): number;
}
