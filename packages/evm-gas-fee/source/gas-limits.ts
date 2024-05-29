import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class GasLimits implements Contracts.Evm.GasLimits {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public of(transaction: Contracts.Crypto.Transaction): number {
		if (transaction.data.asset?.evmCall) {
			return transaction.data.asset.evmCall.gasLimit;
		}

		if (!this.#isNativeType(transaction.type)) {
			throw new Error("must be native type");
		}

		// TODO: take vendorField, multiSig, asset size into account
		const { evm: evmConfig } = this.configuration.getMilestone();
		const nativeGasLimit = evmConfig.nativeGasLimits[transaction.key];
		Utils.assert.defined<number>(nativeGasLimit);
		return nativeGasLimit;
	}

	#isNativeType(transactionType: Contracts.Crypto.TransactionType): boolean {
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
