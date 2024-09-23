import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";

@injectable()
export class TransactionProcessor implements Contracts.Processor.TransactionProcessor {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	async process(
		unit: Contracts.Processor.ProcessableUnit,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Processor.TransactionProcessorResult> {
		const milestone = this.configuration.getMilestone(unit.height);
		const transactionHandler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		const commitKey: Contracts.Evm.CommitKey = {
			height: BigInt(unit.height),
			round: BigInt(unit.getBlock().data.round),
		};

		const transactionHandlerContext: Contracts.Transactions.TransactionHandlerContext = {
			evm: {
				blockContext: {
					commitKey,
					gasLimit: BigInt(milestone.block.maxGasLimit),
					timestamp: BigInt(unit.getBlock().data.timestamp),
					validatorAddress: unit.getBlock().data.generatorAddress,
				},
				instance: this.evm,
			},
		};

		if (!(await transactionHandler.verify(transaction))) {
			throw new Exceptions.InvalidSignatureError();
		}

		const result = await transactionHandler.apply(transactionHandlerContext, transaction);
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		return { gasUsed: result.gasUsed, receipt: result.receipt };
	}
}
