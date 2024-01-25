import { Container, inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application, Ipc, IpcWorker, Services } from "@mainsail/kernel";

@injectable()
class WorkerImpl {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignature!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Identity.PublicKey.Factory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.PublicKeyFactory;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly walletSignature!: Contracts.Crypto.Signature;

	public async callConsensusSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.Signature[K]>,
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.#call(this.consensusSignature, method, arguments_);
	}

	public async callWalletSignawture<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.Signature[K]>,
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.#call(this.walletSignature, method, arguments_);
	}

	public async callTransactionFactory<K extends Ipc.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>,
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.#call(this.transactionFactory, method, arguments_);
	}

	public async callBlockFactory<K extends Ipc.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>,
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		return this.#call(this.blockFactory, method, arguments_);
	}

	public async callPublicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>,
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		return this.#call(this.publicKeyFactory, method, arguments_);
	}

	async #call<T extends { [K in keyof T]: (...arguments_: any) => any }, K extends Ipc.Requests<T>>(
		object: T,
		method: K,
		arguments_: Parameters<T[K]>,
	): Promise<ReturnType<T[K]>> {
		arguments_ = arguments_.map((argument) => {
			if (argument?.type === "Buffer") {
				return Buffer.from(argument.data);
			}

			if (Array.isArray(argument) && argument.length > 0 && argument[0]?.type === "Buffer") {
				return argument.map((item) => Buffer.from(item.data));
			}

			return argument;
		});

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

		await app.bootstrap({
			flags,
		});

		if (!flags.workerLoggingEnabled) {
			app.rebind(Identifiers.Services.Log.Service).to(Services.Log.NullLogger);
		}

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await app.boot();

		this.#app = app;

		this.#impl = app.resolve(WorkerImpl);
	}

	public async consensusSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		// @ts-ignore
		return this.#impl.callConsensusSignature(method, arguments_[0]);
	}

	public async walletSignature<K extends Ipc.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		// @ts-ignore
		return this.#impl.callWalletSignawture(method, arguments_[0]);
	}

	public async blockFactory<K extends Ipc.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		// @ts-ignore
		return this.#impl.callBlockFactory(method, arguments_[0]);
	}

	public async transactionFactory<K extends Ipc.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		// @ts-ignore
		return this.#impl.callTransactionFactory(method, arguments_[0]);
	}

	public async publicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		// @ts-ignore
		return this.#impl.callPublicKeyFactory(method, arguments_[0]);
	}
}
