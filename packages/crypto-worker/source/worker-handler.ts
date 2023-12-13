import { Container, inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application, Ipc, IpcWorker, Services } from "@mainsail/kernel";

@injectable()
class WorkerImpl {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.ITransactionFactory;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly consensusSignature!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "wallet")
	private readonly walletSignature!: Contracts.Crypto.ISignature;

	public async callConsensusSignature<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.ISignature[K]>,
	): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
		return this.#call(this.consensusSignature, method, arguments_);
	}

	public async callWalletSignawture<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.ISignature[K]>,
	): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
		return this.#call(this.walletSignature, method, arguments_);
	}

	public async callTransactionFactory<K extends Ipc.Requests<Contracts.Crypto.ITransactionFactory>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.ITransactionFactory[K]>,
	): Promise<ReturnType<Contracts.Crypto.ITransactionFactory[K]>> {
		return this.#call(this.transactionFactory, method, arguments_);
	}

	public async callBlockFactory<K extends Ipc.Requests<Contracts.Crypto.IBlockFactory>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.IBlockFactory[K]>,
	): Promise<ReturnType<Contracts.Crypto.IBlockFactory[K]>> {
		return this.#call(this.blockFactory, method, arguments_);
	}

	public async callPublicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.IPublicKeyFactory>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.IPublicKeyFactory[K]>,
	): Promise<ReturnType<Contracts.Crypto.IPublicKeyFactory[K]>> {
		return this.#call(this.publicKeyFactory, method, arguments_);
	}

	async #call<T extends { [K in keyof T]: (...arguments_: any) => any }, K extends Ipc.Requests<T>>(
		object: T,
		method: K,
		arguments_: Parameters<T[K]>,
	): Promise<ReturnType<T[K]>> {
		arguments_ = arguments_.map((argument) =>
			argument?.type === "Buffer" ? Buffer.from(argument.data) : argument,
		);

		// @ts-ignore
		return object[method](...arguments_);
	}
}

export class WorkerScriptHandler implements IpcWorker.WorkerScriptHandler {
	// @ts-ignore
	#app: Contracts.Kernel.Application;

	// @ts-ignore
	#impl: WorkerImpl;

	public async boot(flags: IpcWorker.WorkerFlags): Promise<void> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		app.config("worker", true);

		// relative to packages/kernel/source/bootstrap/load-service-providers.ts !
		app.config("pluginPath", "../../../core/node_modules");

		await app.bootstrap({
			flags,
		});

		if (!flags.workerLoggingEnabled) {
			app.rebind(Identifiers.LogService).to(Services.Log.NullLogger);
		}

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await app.boot();

		this.#app = app;

		this.#impl = app.resolve(WorkerImpl);
	}

	public async consensusSignature<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.ISignature[K]>
	): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
		// @ts-ignore
		return this.#impl.callConsensusSignature(method, arguments_[0]);
	}

	public async walletSignature<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.ISignature[K]>
	): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
		// @ts-ignore
		return this.#impl.callWalletSignawture(method, arguments_[0]);
	}

	public async blockFactory<K extends Ipc.Requests<Contracts.Crypto.IBlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.IBlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.IBlockFactory[K]>> {
		// @ts-ignore
		return this.#impl.callBlockFactory(method, arguments_[0]);
	}

	public async transactionFactory<K extends Ipc.Requests<Contracts.Crypto.ITransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.ITransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.ITransactionFactory[K]>> {
		// @ts-ignore
		return this.#impl.callTransactionFactory(method, arguments_[0]);
	}

	public async publicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.IPublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.IPublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.IPublicKeyFactory[K]>> {
		// @ts-ignore
		return this.#impl.callPublicKeyFactory(method, arguments_[0]);
	}
}
