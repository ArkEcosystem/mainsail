const {
    Providers
} = require("../../../../source");

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

exports.ServiceProvider = ServiceProvider;
