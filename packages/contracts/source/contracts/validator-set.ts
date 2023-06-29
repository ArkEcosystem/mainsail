import { Wallet } from "./state";

export interface IValidatorSet {
	initialize(): Promise<void>;
	getActiveValidators(): Promise<Wallet[]>;
	getValidatorPublicKeyByIndex(validatorIndex: number): string;
	getValidatorIndexByPublicKey(publicKey: string): number;
}
