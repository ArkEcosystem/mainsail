import { Container } from "/mainsail/packages/container/distribution/index.js";
import { Identifiers } from "/mainsail/packages/constants/distribution/index.js";
import { Application } from "/mainsail/packages/kernel/distribution/index.js";
import { config } from "./config.mjs"

let app = undefined;

export const getApplication = async () => {
    if (app) {
        return app;
    }

    app = new Application(new Container());

    const plugins = [
        {
            package: "@mainsail/validation",
        },
        {
            package: "@mainsail/crypto-config",
        },
        {
            package: "@mainsail/crypto-validation",
        },
        {
            package: "@mainsail/crypto-hash-bcrypto",
        },
        {
            package: "@mainsail/crypto-signature-ecdsa",
        },
        {
            package: "@mainsail/crypto-key-pair-ecdsa",
        },
        {
            package: "@mainsail/crypto-address-keccak256",
        },
        {
            package: "@mainsail/crypto-consensus-bls12-381",
        },
        {
            package: "@mainsail/crypto-wif",
        },
        {
            package: "@mainsail/serializer",
        },
        {
            package: "@mainsail/crypto-transaction",
        }
    ];

    for (const plugin of plugins) {
        try {
            const { ServiceProvider } = await import(plugin.package.replace("@mainsail/", "/mainsail/packages/") + "/distribution/index.js");
            const serviceProvider= app.resolve(ServiceProvider);
            await serviceProvider.register();
        } catch (error) {
            if (plugin.package !== "@mainsail/crypto-config") {
                console.log(`Failed to register plugin ${plugin.package}`);
                throw error;
            }
        }
    }

    app.get(Identifiers.Cryptography.Configuration).setConfig(config.crypto);

    return app;
};
