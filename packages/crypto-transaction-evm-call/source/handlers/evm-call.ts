import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { EvmCallTransaction } from "../versions/index.js";

@injectable()
export class EvmCallTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public getConstructor(): TransactionConstructor {
		return EvmCallTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async apply(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Evm.TransactionReceipt> {
		Utils.assert.defined<string>(transaction.id);

		const { evmSpec } = this.configuration.getMilestone();

		const { senderAddress } = transaction.data;

		try {
			const { instance, blockContext } = context.evm;
			const { receipt } = await instance.process({
				blockContext,
				caller: senderAddress,
				data: Buffer.from(transaction.data.data, "hex"),
				gasLimit: BigInt(transaction.data.gasLimit),
				gasPrice: BigInt(transaction.data.gasPrice),
				nonce: transaction.data.nonce.toBigInt(),
				recipient: transaction.data.recipientAddress,
				sequence: transaction.data.sequence,
				specId: evmSpec,
				txHash: transaction.id,
				value: transaction.data.value.toBigInt(),
			});

			void this.#emit(Events.EvmEvent.TransactionReceipt, {
				receipt,
				sender: senderAddress,
				transactionId: transaction.id,
			});

			return receipt;
		} catch (error) {
			return this.app.terminate("invalid EVM call", error);
		}
	}

	async #emit<T>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
	}
}
