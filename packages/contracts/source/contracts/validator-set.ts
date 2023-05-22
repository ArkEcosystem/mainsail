import { Wallet } from "./state";

export interface IValidatorSet {
	getActiveValidators(): Promise<Wallet[]>;
}
