import Interfaces, {
	BINDINGS,
	ITransactionDeserializer,
	ITransactionFactory,
} from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts } from "@arkecosystem/core-kernel";
import { ByteBuffer } from "@arkecosystem/utils";

import { InvalidTransactionDataError } from "./errors";

@Container.injectable()
export class Processor implements Contracts.TransactionPool.Processor {
	@Container.multiInject(Container.Identifiers.TransactionPoolProcessorExtension)
	@Container.optional()
	private readonly extensions: Contracts.TransactionPool.ProcessorExtension[] = [];

	@Container.inject(Container.Identifiers.TransactionPoolService)
	private readonly pool!: Contracts.TransactionPool.Service;

	@Container.inject(Container.Identifiers.PeerTransactionBroadcaster)
	@Container.optional()
	private readonly transactionBroadcaster!: Contracts.P2P.TransactionBroadcaster | undefined;

	@Container.inject(Container.Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly transactionFactory: ITransactionFactory;

	@Container.inject(BINDINGS.Transaction.Deserializer)
	private readonly deserializer: ITransactionDeserializer;

	public async process(
		data: Interfaces.ITransactionData[] | Buffer[],
	): Promise<Contracts.TransactionPool.ProcessorResult> {
		const accept: string[] = [];
		const broadcast: string[] = [];
		const invalid: string[] = [];
		const excess: string[] = [];
		let errors: { [id: string]: Contracts.TransactionPool.ProcessorError } | undefined;

		const broadcastTransactions: Interfaces.ITransaction[] = [];

		try {
			for (const [index, transactionData] of data.entries()) {
				const entryId = transactionData instanceof Buffer ? String(index) : transactionData.id ?? String(index);

				try {
					const transaction =
						transactionData instanceof Buffer
							? await this.getTransactionFromBuffer(transactionData)
							: await this.getTransactionFromData(transactionData);
					await this.pool.addTransaction(transaction);
					accept.push(entryId);

					try {
						await Promise.all(this.extensions.map((e) => e.throwIfCannotBroadcast(transaction)));
						broadcastTransactions.push(transaction);
						broadcast.push(entryId);
					} catch {}
				} catch (error) {
					invalid.push(entryId);

					if (error instanceof Contracts.TransactionPool.PoolError) {
						if (error.type === "ERR_EXCEEDS_MAX_COUNT") {
							excess.push(entryId);
						}

						if (!errors) {
							errors = {};
						}
						errors[entryId] = {
							message: error.message,
							type: error.type,
						};
					} else {
						throw error;
					}
				}
			}
		} finally {
			if (this.transactionBroadcaster && broadcastTransactions.length > 0) {
				this.transactionBroadcaster
					.broadcastTransactions(broadcastTransactions)
					.catch((error) => this.logger.error(error.stack));
			}
		}

		return {
			accept,
			broadcast,
			errors,
			excess,
			invalid,
		};
	}

	private async getTransactionFromBuffer(transactionData: Buffer): Promise<Interfaces.ITransaction> {
		try {
			const transactionCommon = {} as Interfaces.ITransactionData;
			const txByteBuffer = new ByteBuffer(transactionData);
			this.deserializer.deserializeCommon(transactionCommon, txByteBuffer);

			return this.transactionFactory.fromBytes(transactionData);
		} catch (error) {
			throw new InvalidTransactionDataError(error.message);
		}
	}

	private async getTransactionFromData(
		transactionData: Interfaces.ITransactionData,
	): Promise<Interfaces.ITransaction> {
		try {
			return this.transactionFactory.fromData(transactionData);
		} catch (error) {
			throw new InvalidTransactionDataError(error.message);
		}
	}
}
