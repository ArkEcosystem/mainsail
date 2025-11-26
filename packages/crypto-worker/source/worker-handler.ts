import { Identifiers } from "@mainsail/constants";
import { Container, inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Application, Services } from "@mainsail/kernel";

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

	public async callConsensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.Signature>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.Signature, K>,
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.#call(this.consensusSignature, method, arguments_);
	}

	public async callWalletSignawture<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.Signature>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.Signature, K>,
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		return this.#call(this.walletSignature, method, arguments_);
	}

	public async callTransactionFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.TransactionFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.#call(this.transactionFactory, method, arguments_);
	}

	public async callBlockFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.BlockFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		return this.#call(this.blockFactory, method, arguments_);
	}

	public async callPublicKeyFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.PublicKeyFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		return this.#call(this.publicKeyFactory, method, arguments_);
	}

	async #call<T, K extends Contracts.Kernel.IPC.Requests<T> & keyof T>(
		object: T,
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<T, K>,
	): Promise<Contracts.Kernel.IPC.MethodReturn<T, K>> {
		const normalizedArguments = (arguments_ as unknown[]).map((argument) => {
			if (isBufferJson(argument)) {
				return Buffer.from(argument.data);
			}

			if (Array.isArray(argument) && argument.length > 0 && isBufferJson(argument[0])) {
				return argument.map((item) => Buffer.from(item.data));
			}

			return argument;
		}) as Contracts.Kernel.IPC.MethodArguments<T, K>;

		if (typeof object[method] !== "function") {
			throw new TypeError(`property "${method}" is not a function`);
		}

		return (
			object[method] as (
				...arguments__: Contracts.Kernel.IPC.MethodArguments<T, K>
			) => Contracts.Kernel.IPC.MethodReturn<T, K>
		)(...normalizedArguments);
	}
}

type BufferJson = {
	type: "Buffer";
	data: Uint8Array | number[];
};

function isBufferJson(value: unknown): value is BufferJson {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const v = value as { type?: unknown; data?: unknown };
	if (v.type !== "Buffer") {
		return false;
	}

	return Array.isArray(v.data) || v.data instanceof Uint8Array;
}

export class WorkerScriptHandler implements Contracts.Crypto.WorkerScriptHandler {
	#impl!: WorkerImpl;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		await app.bootstrap({
			flags,
		});

		if (!flags.workerLoggingEnabled) {
			app.rebind(Identifiers.Services.Log.Service).to(Services.Log.NullLogger);
		}

		await app.boot();
		this.#impl = app.resolve(WorkerImpl);
	}

	public async consensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		// @ts-ignore
		return this.#impl.callConsensusSignature(method, arguments_[0]);
	}

	public async walletSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.Signature>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.Signature[K]>
	): Promise<ReturnType<Contracts.Crypto.Signature[K]>> {
		// @ts-ignore
		return this.#impl.callWalletSignawture(method, arguments_[0]);
	}

	public async blockFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.BlockFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		// @ts-ignore
		return this.#impl.callBlockFactory(method, arguments_[0]);
	}

	public async transactionFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.TransactionFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		// @ts-ignore
		return this.#impl.callTransactionFactory(method, arguments_[0]);
	}

	public async publicKeyFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		...arguments_: Parameters<Contracts.Crypto.PublicKeyFactory[K]>
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		// @ts-ignore
		return this.#impl.callPublicKeyFactory(method, arguments_[0]);
	}
}
