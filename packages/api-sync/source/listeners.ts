import { inject, injectable, interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import * as ApiSyncContracts from "./contracts";
import { Mempool } from "./listeners/mempool";
import { Peers } from "./listeners/peers";
import { Plugins } from "./listeners/plugins";

@injectable()
export class Listeners implements ApiSyncContracts.Listeners {
    @inject(Identifiers.Application)
    private readonly app!: Contracts.Kernel.Application;

    #listeners: ApiSyncContracts.EventListener[] = [];

    public async register(): Promise<void> {
        // Listen to events before bootstrap, so we can catch all boot events.
        for (const constructor of [Peers, Plugins, Mempool]) {
            const listener = this.app.resolve(constructor as interfaces.Newable<ApiSyncContracts.EventListener>);
            await listener.register();
            this.#listeners.push(listener);
        }
    }

    public async bootstrap(): Promise<void> {
        for (const listener of this.#listeners) {
            await listener.boot();
        }
    }

    public async dispose(): Promise<void> {
        for (const listener of this.#listeners) {
            await listener.dispose();
        }

        this.#listeners = [];
    }
}