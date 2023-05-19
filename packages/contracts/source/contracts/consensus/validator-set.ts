import { type State } from "../";

export interface IValidatorSet {
	getActiveValidators(): Promise<State.Wallet[]>;
}