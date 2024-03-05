import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class VerifyBlockVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Block.Verifier)
	private readonly blockVerifier!: Contracts.Crypto.BlockVerifier;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		let verification: Contracts.Crypto.BlockVerification = await this.blockVerifier.verify(block);

		if (verification.containsMultiSignatures) {
			try {
				for (const transaction of block.transactions) {
					const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
					await handler.verify({ evm: this.evm, walletRepository: unit.store.walletRepository }, transaction);
				}

				// @TODO: check if we can remove this duplicate verification
				verification = await this.blockVerifier.verify(block);
			} catch (error) {
				throw new Exceptions.BlockNotVerified(block, error.message);
			}
		}

		if (!verification.verified) {
			throw new Exceptions.BlockNotVerified(block, verification.errors.join(", "));
		}
	}
}
