import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
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
		assert.string(transaction.data.from);
		return this.verifier.verifyHash(transaction.data);
	}

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
		evm: Contracts.Evm.Instance,
	): Promise<void> {
		// Legacy
		if (sender.hasLegacySecondPublicKey()) {
			await this.verifier.verifyLegacySecondSignature(transaction.data, sender.legacySecondPublicKey());
		} else {
			if (transaction.data.legacySecondSignature) {
				throw new UnexpectedLegacySecondSignatureError();
			}
		}

		const milestone = this.configuration.getMilestone();

		const preverified = await evm.preverifyTransaction({
			blockGasLimit: BigInt(milestone.block.maxGasLimit),
			data: Buffer.from(transaction.data.data, "hex"),
			from: transaction.data.from,
			gasLimit: BigInt(transaction.data.gasLimit),
			gasPrice: BigInt(transaction.data.gasPrice),
			legacyAddress: transaction.data.senderLegacyAddress,
			nonce: transaction.data.nonce.toBigInt(),
			specId: milestone.evmSpec,
			to: transaction.data.to,
			txHash: transaction.data.hash,
			value: transaction.data.value.toBigInt(),
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

		const { from, senderLegacyAddress } = transaction.data;

		try {
			const { instance, blockContext } = context.evm;
			const { receipt } = await instance.process({
				blockContext,
				data: Buffer.from(transaction.data.data, "hex"),
				from,
				gasLimit: BigInt(transaction.data.gasLimit),
				gasPrice: BigInt(transaction.data.gasPrice),
				index: transaction.data.transactionIndex,
				legacyAddress: senderLegacyAddress,
				nonce: transaction.data.nonce.toBigInt(),
				specId: evmSpec,
				to: transaction.data.to,
				txHash: transaction.hash,
				value: transaction.data.value.toBigInt(),
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
