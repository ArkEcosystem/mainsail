import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class NativeGas {
	@inject(Identifiers.Cryptography.Configuration)
	//@ts-ignore
	private readonly configuration!: Contracts.Crypto.Configuration;

	public get(transaction: string, version = 1): number {
		// const key = `${transaction}.${version}`;
		// const evmConfig = this.configuration.getMilestone().evm;

		// evmConfig.nativeTransactionGasLimits

		return 0;
	}

	public isNativeType(transactionType: Contracts.Crypto.TransactionType): boolean {
		return this.#nativeTransactionTypes.has(transactionType);
	}

	#nativeTransactionTypes = new Set([
		Contracts.Crypto.TransactionType.Transfer,
		Contracts.Crypto.TransactionType.ValidatorRegistration,
		Contracts.Crypto.TransactionType.Vote,
		Contracts.Crypto.TransactionType.MultiSignature,
		Contracts.Crypto.TransactionType.MultiPayment,
		Contracts.Crypto.TransactionType.ValidatorResignation,
		Contracts.Crypto.TransactionType.UsernameRegistration,
		Contracts.Crypto.TransactionType.UsernameResignation,
	]);
}

// export const NativeGas = {
// 	[Contracts.Crypto.TransactionType.Transfer]: 21000,
// 	[Contracts.Crypto.TransactionType.ValidatorRegistration]: 50000,
// 	[Contracts.Crypto.TransactionType.Vote]: 50000,
// 	[Contracts.Crypto.TransactionType.MultiSignature]: 50000,
// 	[Contracts.Crypto.TransactionType.MultiPayment]: 50000,
// 	[Contracts.Crypto.TransactionType.ValidatorResignation]: 50000,
// 	[Contracts.Crypto.TransactionType.UsernameRegistration]: 50000,
// 	[Contracts.Crypto.TransactionType.UsernameResignation]: 50000,
// };
