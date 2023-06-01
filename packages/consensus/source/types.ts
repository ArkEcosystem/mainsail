export interface IValidatorSetMajority {
	aggSignature: string;
	aggPublicKey: string;
	validatorSet: Set<Buffer>;
}
