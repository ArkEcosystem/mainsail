import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application, Services } from "@mainsail/kernel";

import { WorkerImplementation } from "./worker-implementation.js";

export class WorkerScriptHandler implements Contracts.Crypto.WorkerScriptHandler {
	#app = new Application();
	#impl!: WorkerImplementation;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		await this.#app.bootstrap({
			flags,
		});

		if (!flags.workerLoggingEnabled) {
			this.#app.rebind(Identifiers.Services.Log.Service).to(Services.Log.NullLogger);
		}

		await this.#app.boot();
		this.#impl = this.#app.resolve(WorkerImplementation);
	}

	public async dispose(): Promise<void> {
		await this.#app.terminate();
	}

	public async consensusSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureBls>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.SignatureBls, K>,
	): Promise<ReturnType<Contracts.Crypto.SignatureBls[K]>> {
		return this.#impl.callConsensusSignature(method, arguments_);
	}

	public async walletSignature<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.SignatureEcdsa>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.SignatureEcdsa, K>,
	): Promise<ReturnType<Contracts.Crypto.SignatureEcdsa[K]>> {
		return this.#impl.callWalletSignature(method, arguments_);
	}

	public async blockFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.BlockFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.BlockFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.BlockFactory[K]>> {
		return this.#impl.callBlockFactory(method, arguments_);
	}

	public async transactionFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.TransactionFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.TransactionFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.TransactionFactory[K]>> {
		return this.#impl.callTransactionFactory(method, arguments_);
	}

	public async publicKeyFactory<K extends Contracts.Kernel.IPC.Requests<Contracts.Crypto.PublicKeyFactory>>(
		method: K,
		arguments_: Contracts.Kernel.IPC.MethodArguments<Contracts.Crypto.PublicKeyFactory, K>,
	): Promise<ReturnType<Contracts.Crypto.PublicKeyFactory[K]>> {
		return this.#impl.callPublicKeyFactory(method, arguments_);
	}
}
