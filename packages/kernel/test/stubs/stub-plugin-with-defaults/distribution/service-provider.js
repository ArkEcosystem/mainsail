import { Providers } from "../../../../source"

class ServiceProvider extends Providers.ServiceProvider {
    async register() {
        //
    }

    async boot() {
        //
    }

    async dispose() {
        //
    }

    configDefaults() {
        return {
            key: "value"
        };
    }
}

export { ServiceProvider };
