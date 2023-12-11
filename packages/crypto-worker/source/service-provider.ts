import Joi from "joi";
import { fork } from "child_process";
import { Providers, Ipc, IpcWorker } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/contracts";
import { Worker } from "./worker";
import { WorkerPool } from "./worker-pool";
import { cpus } from "os";

export class ServiceProvider extends Providers.ServiceProvider {
    public async register(): Promise<void> {
        this.app.bind(Identifiers.Ipc.Worker).to(Worker);
        this.app.bind(Identifiers.Ipc.WorkerPool).to(WorkerPool).inSingletonScope();

        this.app.bind(Identifiers.Ipc.WorkerSubprocessFactory).toFactory(() => {
            return () => {
                const subprocess = fork(`${__dirname}/worker-script.js`, {});
                return new Ipc.Subprocess(subprocess);
            };
        });

        this.app
            .bind(Identifiers.Ipc.WorkerFactory)
            .toAutoFactory(Identifiers.Ipc.Worker);
    }

    public async boot(): Promise<void> {
        await this.app.get<IpcWorker.WorkerPool>(Identifiers.Ipc.WorkerPool).boot();
    }

    public async dispose(): Promise<void> {
        await this.app.get<IpcWorker.WorkerPool>(Identifiers.Ipc.WorkerPool).shutdown();
    }

    public async required(): Promise<boolean> {
        return true;
    }

    public configSchema(): Joi.AnySchema {
        return Joi.object({
            workerCount: Joi.number().integer().min(1).max(cpus().length).required(),
        }).unknown(true);
    }
}
