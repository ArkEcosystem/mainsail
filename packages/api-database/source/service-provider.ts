import { Providers } from "@mainsail/kernel";

import { Identifiers } from "./identifiers";
import { Factory } from "./factory";

export class ServiceProvider extends Providers.ServiceProvider {
    public async register(): Promise<void> {
        // TODO: use factory?
        this.app.bind(Identifiers.Factory).to(Factory).inSingletonScope();
    }

    public async dispose(): Promise<void> {
        if (!this.app.isBound(Identifiers.Factory)) {
            return;
        }

        await this.app
            .get<Factory>(Identifiers.Factory).destroy()
    }
}
