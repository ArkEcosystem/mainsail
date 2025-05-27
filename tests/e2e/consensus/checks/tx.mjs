import { Container } from "/mainsail/packages/container/distribution/index.js";
import { Identifiers } from "/mainsail/packages/contracts/distribution/index.js";
import { Application } from "/mainsail/packages/kernel/distribution/index.js";
import { EvmCallBuilder } from "/mainsail/packages/crypto-transaction-evm-call/distribution/index.js";

import { getWalletNonce } from "./client.mjs";
import { config } from "./config.mjs"

let app = undefined;


export const makeEvmCall = async (
    to,
    amount,
) => {
    const app = await getApplication(config);

    const addressFactory = app.getTagged(Identifiers.Cryptography.Identity.Address.Factory, "type", "wallet");
    const senderAddress = await addressFactory.fromMnemonic(config.senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    let builder = app
        .resolve(EvmCallBuilder)
        .gasPrice("5000000000")
        .gasLimit(21000)
        .payload("")
        .recipientAddress(to)
        .value(amount)
        .nonce(walletNonce.toString());

    const signed = await builder.sign(config.senderPassphrase);

    return signed.build();
};

export const makeEvmDeploy = async (
    abi,
    nonceOffset = 0,
) => {
    const app = await getApplication(config);

    const addressFactory = app.getTagged(Identifiers.Cryptography.Identity.Address.Factory, "type", "wallet");
    const senderAddress = await addressFactory.fromMnemonic(config.senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    let builder = app
        .resolve(EvmCallBuilder)
        .gasPrice("5000000000")
        .gasLimit(4_000_000)
        .payload(abi.bytecode.object.slice(2))
        .nonce((walletNonce + nonceOffset).toString());

    const signed = await builder.sign(config.senderPassphrase);

    return signed.build();
};

const getApplication = async (config) => {
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
        },
        {
            package: "@mainsail/crypto-transaction-evm-call",
        },
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
