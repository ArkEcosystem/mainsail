import { Application, Ipc, IpcWorker, Types } from "@mainsail/kernel";
import { Container, inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

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

    public async callConsensusSignature<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(method: K, args: Parameters<Contracts.Crypto.ISignature[K]>): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
        return this.#call(this.consensusSignature, method, args);
    }

    public async callWalletSignawture<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(method: K, args: Parameters<Contracts.Crypto.ISignature[K]>): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
        return this.#call(this.walletSignature, method, args);
    }

    public async callTransactionFactory<K extends Ipc.Requests<Contracts.Crypto.ITransactionFactory>>(method: K, args: Parameters<Contracts.Crypto.ITransactionFactory[K]>): Promise<ReturnType<Contracts.Crypto.ITransactionFactory[K]>> {
        return this.#call(this.transactionFactory, method, args);
    }

    public async callBlockFactory<K extends Ipc.Requests<Contracts.Crypto.IBlockFactory>>(method: K, args: Parameters<Contracts.Crypto.IBlockFactory[K]>): Promise<ReturnType<Contracts.Crypto.IBlockFactory[K]>> {
        return this.#call(this.blockFactory, method, args);
    }

    public async callPublicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.IPublicKeyFactory>>(method: K, args: Parameters<Contracts.Crypto.IPublicKeyFactory[K]>): Promise<ReturnType<Contracts.Crypto.IPublicKeyFactory[K]>> {
        return this.#call(this.publicKeyFactory, method, args);
    }

    async #call<T extends { [K in keyof T]: (...args: any) => any }, K extends Ipc.Requests<T>>(obj: T, method: K, args: Parameters<T[K]>): Promise<ReturnType<T[K]>> {
        args = args.map(arg => (arg?.type === "Buffer" ? Buffer.from(arg.data) : arg));

        // @ts-ignore
        return obj[method](...args);
    }
}

export class WorkerScriptHandler implements IpcWorker.WorkerScriptHandler {
    // @ts-ignore
    #app: Contracts.Kernel.Application;

    // @ts-ignore
    #impl: WorkerImpl;

    public async boot(flags: Types.KeyValuePair): Promise<void> {
        const app: Contracts.Kernel.Application = new Application(new Container());

        app.config("worker", true);

        // relative to packages/kernel/source/bootstrap/load-service-providers.ts !
        app.config("pluginPath", "../../../core/node_modules");

        await app.bootstrap({
            flags,
        });

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await app.boot();
        this.#app = app;

        this.#impl = app.resolve(WorkerImpl);
    }

    public async consensusSignature<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(method: K, ...args: Parameters<Contracts.Crypto.ISignature[K]>): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
        // @ts-ignore
        return this.#impl.callConsensusSignature(method, args[0]);
    }

    public async walletSignature<K extends Ipc.Requests<Contracts.Crypto.ISignature>>(method: K, ...args: Parameters<Contracts.Crypto.ISignature[K]>): Promise<ReturnType<Contracts.Crypto.ISignature[K]>> {
        // @ts-ignore
        return this.#impl.callWalletSignawture(method, args[0]);
    }

    public async blockFactory<K extends Ipc.Requests<Contracts.Crypto.IBlockFactory>>(method: K, ...args: Parameters<Contracts.Crypto.IBlockFactory[K]>): Promise<ReturnType<Contracts.Crypto.IBlockFactory[K]>> {
        // @ts-ignore
        return this.#impl.callBlockFactory(method, args[0]);
    }

    public async transactionFactory<K extends Ipc.Requests<Contracts.Crypto.ITransactionFactory>>(method: K, ...args: Parameters<Contracts.Crypto.ITransactionFactory[K]>): Promise<ReturnType<Contracts.Crypto.ITransactionFactory[K]>> {
        // @ts-ignore
        return this.#impl.callTransactionFactory(method, args[0]);
    }

    public async publicKeyFactory<K extends Ipc.Requests<Contracts.Crypto.IPublicKeyFactory>>(method: K, ...args: Parameters<Contracts.Crypto.IPublicKeyFactory[K]>): Promise<ReturnType<Contracts.Crypto.IPublicKeyFactory[K]>> {
        // @ts-ignore
        return this.#impl.callPublicKeyFactory(method, args[0]);
    }
}
