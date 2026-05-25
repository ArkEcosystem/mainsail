import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import {
	EvmCallFailedError,
	TransactionFailedToPreverifyError,
	UnexpectedLegacySecondSignatureError,
} from "@mainsail/exceptions";

@injectable()
export class TransactionHandler implements Contracts.Transactions.TransactionHandler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier!: Contracts.Crypto.TransactionVerifier;

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
		evm: Contracts.Evm.Instance,
	): Promise<void> {
		await this.#verifyLegacySecondSignature(transaction, sender);
		await this.#preverifyEvm(transaction, evm);
	}

	async #verifyLegacySecondSignature(
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
	): Promise<void> {
		if (sender.hasLegacySecondPublicKey()) {
			await this.verifier.verifyLegacySecondSignature(transaction, sender.legacySecondPublicKey());
		} else if (transaction.legacySecondSignature) {
			throw new UnexpectedLegacySecondSignatureError();
		}
	}

	async #preverifyEvm(transaction: Contracts.Crypto.Transaction, evm: Contracts.Evm.Instance): Promise<void> {
		const milestone = this.configuration.getMilestone();

		const preverified = await evm.preverifyTransaction({
			...this.#toEvmTransactionFields(transaction, milestone.evmSpec),
			blockGasLimit: BigInt(milestone.block.maxGasLimit),
		});

		if (!preverified.success) {
			throw new TransactionFailedToPreverifyError(transaction, preverified.error ?? "unknown");
		}
	}

	public async apply(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt> {
		const { evmSpec } = this.configuration.getMilestone();
		const { blockContext, instance } = context.evm;

		try {
			const { receipt } = await instance.process({
				...this.#toEvmTransactionFields(transaction, evmSpec),
				blockContext,
			});
			return receipt;
		} catch (error) {
			throw new EvmCallFailedError(transaction, error);
		}
	}

	#toEvmTransactionFields(transaction: Contracts.Crypto.Transaction, specId: Contracts.Evm.SpecId) {
		return {
			data: Buffer.from(transaction.data.slice(2), "hex"),
			from: transaction.from,
			gasLimit: BigInt(transaction.gasLimit),
			gasPrice: BigInt(transaction.gasPrice),
			legacyAddress: transaction.senderLegacyAddress,
			nonce: transaction.nonce,
			specId,
			to: transaction.to,
			txHash: transaction.hash,
			value: transaction.value,
		};
	}
}
