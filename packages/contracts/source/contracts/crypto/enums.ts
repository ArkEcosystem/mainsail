export enum TransactionType {
	Transfer = 0,
	ValidatorRegistration = 2,
	Vote = 3,
	MultiSignature = 4,
	MultiPayment = 6,
	ValidatorResignation = 7,
}

export enum TransactionTypeGroup {
	Test = 0,
	Core = 1,

	// Everything above is available to anyone
	Reserved = 1000,
}
