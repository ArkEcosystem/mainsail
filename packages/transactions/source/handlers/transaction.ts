import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
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

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	public async verify(transaction: Contracts.Crypto.Transaction): Promise<boolean> {
		assert.string(transaction.from);
		return this.verifier.verifyHash(transaction);
	}

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
			data: Buffer.from(transaction.data, "hex"),
			from: transaction.from,
			gasLimit: BigInt(transaction.gasLimit),
			gasPrice: BigInt(transaction.gasPrice),
			legacyAddress: transaction.senderLegacyAddress,
			nonce: transaction.nonce.toBigInt(),
			specId: milestone.evmSpec,
			to: transaction.to,
			txHash: transaction.hash,
			value: transaction.value.toBigInt(),
		});

		if (!preverified.success) {
			throw new TransactionFailedToPreverifyError(transaction, new Error(preverified.error));
		}
	}

	public async apply(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		index: number,
	): Promise<Contracts.Evm.TransactionReceipt> {
		assert.string(transaction.hash);

		const { evmSpec } = this.configuration.getMilestone();

		const { from, senderLegacyAddress } = transaction;

		try {
			const { instance, blockContext } = context.evm;
			const { receipt } = await instance.process({
				blockContext,
				data: Buffer.from(transaction.data, "hex"),
				from,
				gasLimit: BigInt(transaction.gasLimit),
				gasPrice: BigInt(transaction.gasPrice),
				index,
				legacyAddress: senderLegacyAddress,
				nonce: transaction.nonce.toBigInt(),
				specId: evmSpec,
				to: transaction.to,
				txHash: transaction.hash,
				value: transaction.value.toBigInt(),
			});

			void this.#emit(Events.EvmEvent.TransactionReceipt, {
				receipt,
				sender: from,
				transactionId: transaction.hash,
			});

			return receipt;
		} catch (error) {
			throw new Error(`invalid EVM call: ${error.message}`);
		}
	}

	async #emit<T>(event: string, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
	}
}

export type TransactionHandlerConstructor = new () => TransactionHandler;
