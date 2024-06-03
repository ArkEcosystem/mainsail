import { Container, inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

@injectable()
class WorkerImpl {
	// @ts-ignore
	#app: Contracts.Kernel.Application;
}
@injectable()
class CommitAction {
	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPool.Query)
	private readonly transactionPoolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(
		parameters: Contracts.TransactionPool.Actions.CommitRequest,
	): Promise<Contracts.TransactionPool.Actions.CommitResponse> {
		try {
			const store = this.stateService.createStoreClone();

			store.applyChanges(parameters.store);
			store.commitChanges();

			this.configuration.setHeight(store.getLastHeight() + 1);

			const block = await this.blockFactory.fromHex(parameters.block);
			store.setLastBlock(block);

			for (const transaction of block.transactions) {
				await this.transactionPoolService.removeForgedTransaction(transaction);
			}

			for (const transactionId of parameters.failedTransactions) {
				try {
					const transaction = await this.transactionPoolQuery.getAll().whereId(transactionId).first();
					await this.transactionPoolService.removeTransaction(transaction);
				} catch {}
			}

			await this.stateService.export(block.data.height);

			this.logger.info(
				`Block ${block.data.height.toLocaleString()} with ${block.data.numberOfTransactions.toLocaleString()} tx(s) committed.`,
			);
		} catch (error) {
			this.logger.error(`Failed to commit block: ${error.message}`);

			throw new Error(`Cannot process changes, because: ${error.message}`);
		}

		return true;
	}
}

export class WorkerScriptHandler implements Contracts.TransactionPool.WorkerScriptHandler {
	// @ts-ignore
	#app: Contracts.Kernel.Application;

	// @ts-ignore
	#impl: WorkerImpl;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		await app.bootstrap({
			flags,
		});

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await app.boot();

		this.#app = app;

		this.#impl = app.resolve(WorkerImpl);
	}

	public async importSnapshot(height: number): Promise<void> {
		await this.#app.get<Contracts.State.Service>(Identifiers.State.Service).restore(height);
	}

	public async commit(data: Contracts.TransactionPool.Actions.CommitRequest): Promise<void> {
		await this.#app.resolve(CommitAction).handle(data);
	}
}
