import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { TransactionFailedToPreverifyError, UnexpectedLegacySecondSignatureError } from "@mainsail/exceptions";
import { assert } from "@mainsail/utils";

@injectable()
export class TransactionHandler implements Contracts.Transactions.TransactionHandler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier!: Contracts.Crypto.TransactionVerifier;

	@inject(Identifiers.BlockchainUtils.FeeCalculator)
	protected readonly feeCalculator!: Contracts.BlockchainUtils.FeeCalculator;

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
		evm: Contracts.Evm.Instance,
	): Promise<void> {
		// Legacy
		if (sender.hasLegacySecondPublicKey()) {
			await this.verifier.verifyLegacySecondSignature(transaction, sender.legacySecondPublicKey());
		} else {
			if (transaction.legacySecondSignature) {
				throw new UnexpectedLegacySecondSignatureError();
			}
		}

		const milestone = this.configuration.getMilestone();

		const preverified = await evm.preverifyTransaction({
			blockGasLimit: BigInt(milestone.block.maxGasLimit),
			data: Buffer.from(transaction.data.slice(2), "hex"),
			from: transaction.from,
			gasLimit: BigInt(transaction.gasLimit),
			gasPrice: BigInt(transaction.gasPrice),
			legacyAddress: transaction.senderLegacyAddress,
			nonce: transaction.nonce,
			specId: milestone.evmSpec,
			to: transaction.to,
			txHash: transaction.hash,
			value: transaction.value,
		});

		if (!preverified.success) {
			throw new TransactionFailedToPreverifyError(transaction, new Error(preverified.error));
		}
	}

	public async apply(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt> {
		assert.string(transaction.hash);

		const { evmSpec } = this.configuration.getMilestone();

		try {
			const { blockContext, instance } = context.evm;
			const data = {
				blockContext,
				data: Buffer.from(transaction.data.slice(2), "hex"),
				from: transaction.from,
				gasLimit: BigInt(transaction.gasLimit),
				gasPrice: BigInt(transaction.gasPrice),
				legacyAddress: transaction.senderLegacyAddress,
				nonce: transaction.nonce,
				specId: evmSpec,
				to: transaction.to,
				txHash: transaction.hash,
				value: transaction.value,
			};

			const { receipt } = await instance.process(data);

			return receipt;
		} catch (error) {
			throw new Error(`invalid EVM call: ${error.message}`);
		}
	}
}

export type TransactionHandlerConstructor = new () => TransactionHandler;
