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

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

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
		Utils.assert.defined<Contracts.Crypto.EvmCallAsset>(transaction.data.asset?.evmCall);
		Utils.assert.defined<string>(transaction.id);

		const { evmCall } = transaction.data.asset;

		const { evmSpec } = this.configuration.getMilestone();

		const address = await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey);

		try {
			const { instance, blockContext } = context.evm;
			const { receipt } = await instance.process({
				blockContext,
				caller: address,
				data: Buffer.from(evmCall.payload, "hex"),
				gasLimit: BigInt(evmCall.gasLimit),
				gasPrice: transaction.data.fee.toBigInt(),
				nonce: transaction.data.nonce.toBigInt(),
				recipient: transaction.data.recipientId,
				sequence: transaction.data.sequence,
				specId: evmSpec,
				txHash: transaction.id,
				value: transaction.data.amount.toBigInt(),
			});

			void this.#emit(Events.EvmEvent.TransactionReceipt, {
				receipt,
				sender: address,
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
