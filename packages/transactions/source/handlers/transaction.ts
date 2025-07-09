import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

@injectable()
export abstract class TransactionHandler implements Contracts.Transactions.TransactionHandler {
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
	protected readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

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
				throw new Exceptions.UnexpectedLegacySecondSignatureError();
			}
		}

		const milestone = this.configuration.getMilestone();

		const preverified = await evm.preverifyTransaction({
			blockGasLimit: BigInt(milestone.block.maxGasLimit),
			data: Buffer.from(transaction.data.data, "hex"),
			from: transaction.data.from,
			gasLimit: BigInt(transaction.data.gas),
			gasPrice: BigInt(transaction.data.gasPrice),
			legacyAddress: transaction.data.senderLegacyAddress,
			nonce: transaction.data.nonce.toBigInt(),
			specId: milestone.evmSpec,
			to: transaction.data.to,
			txHash: transaction.data.hash,
			value: transaction.data.value.toBigInt(),
		});

		if (!preverified.success) {
			throw new Exceptions.TransactionFailedToPreverifyError(transaction, new Error(preverified.error));
		}
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction): void {}

	public abstract apply(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt>;

	public abstract getConstructor(): Contracts.Crypto.TransactionConstructor;

	public abstract dependencies(): ReadonlyArray<TransactionHandlerConstructor>;

	public abstract isActivated(): Promise<boolean>;
}

export type TransactionHandlerConstructor = new () => TransactionHandler;
