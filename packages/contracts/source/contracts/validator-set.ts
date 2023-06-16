import { Wallet } from "./state";

export interface IValidatorSet {
	getActiveValidators(): Promise<Wallet[]>;
	getValidatorPublicKeyByIndex(validatorIndex: number): Promise<string>;
	getValidatorIndexByPublicKey(publicKey: string): number;
}
