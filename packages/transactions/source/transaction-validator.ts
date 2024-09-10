import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { strictEqual } from "assert";

@injectable()
export class TransactionValidator implements Contracts.Transactions.TransactionValidator {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "ephemeral")
	private readonly evm!: Contracts.Evm.Instance;

	@inject(Identifiers.Transaction.Handler.Registry)
	private readonly handlerRegistry!: Contracts.Transactions.TransactionHandlerRegistry;

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	#walletRepository!: Contracts.State.WalletRepository;

	@postConstruct()
	public initialize(): void {
		this.#walletRepository = this.stateService.createStoreClone().walletRepository;
	}

	public getEvm(): Contracts.Evm.Instance {
		return this.evm;
	}

	public async validate(
		context: Contracts.Transactions.TransactionValidatorContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Transactions.TransactionValidatorResult> {
		const deserialized: Contracts.Crypto.Transaction = await this.transactionFactory.fromBytes(
			transaction.serialized,
		);
		strictEqual(transaction.id, deserialized.id);

		const { commitKey, gasLimit, timestamp, generatorAddress } = context;

		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		const result = await handler.apply(
			{
				evm: {
					blockContext: {
						commitKey,
						gasLimit: BigInt(gasLimit),
						timestamp: BigInt(timestamp),
						validatorAddress: generatorAddress,
					},
					instance: this.evm,
				},
				walletRepository: this.#walletRepository,
			},
			transaction,
		);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		return { gasUsed: result.gasUsed };
	}
}
