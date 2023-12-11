import { Contracts, Identifiers } from "@mainsail/contracts";
import { IpcWorker, Providers, Types } from "@mainsail/kernel";
import { inject, injectable, tagged } from "@mainsail/container";

@injectable()
export class WorkerPool implements IpcWorker.WorkerPool {
    @inject(Identifiers.PluginConfiguration)
    @tagged("plugin", "crypto-worker")
    private readonly configuration!: Providers.PluginConfiguration;

    @inject(Identifiers.LogService)
    private readonly logger!: Contracts.Kernel.Logger;

    @inject(Identifiers.Ipc.WorkerFactory)
    private readonly createWorker!: IpcWorker.WorkerFactory;

    private workers: IpcWorker.Worker[] = [];

    @inject(Identifiers.ConfigFlags)
    private readonly flags!: Types.KeyValuePair;

    public async boot(): Promise<void> {
        const workerCount = this.configuration.getRequired<number>("workerCount");

        for (let i = 0; i < workerCount; i++) {
            const worker = this.createWorker();
            this.workers.push(worker);
        }

        this.logger.info(`Booting up ${this.workers.length} workers`);

        await Promise.all(this.workers.map(worker => worker.boot(this.flags)));
    }

    public async shutdown(signal?: number | NodeJS.Signals): Promise<void> {
        await Promise.all(this.workers.map(worker => worker.kill(signal)));
    }

    public async getWorker(): Promise<IpcWorker.Worker> {
        const worker = this.workers.reduce((prev, next) => {
            if (prev.getQueueSize() < next.getQueueSize()) {
                return prev;
            } else {
                return next;
            }
        });

        await worker.boot(this.flags);

        return worker;
    }

}
