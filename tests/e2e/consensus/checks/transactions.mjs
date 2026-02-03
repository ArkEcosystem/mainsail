import { ConsensusAbi } from "/mainsail/packages/evm-contracts/distribution/index.js";
import { Identifiers } from "/mainsail/packages/constants/distribution/index.js";
import { TransactionBuilder } from "/mainsail/packages/crypto-transaction/distribution/index.js";
import { getApplication } from "./app.mjs";
import { postTransactions, getWalletNonce } from "./client.mjs";
import { config } from "./config.mjs";

export const broadcastedTransactions = [];

export async function broadcastTransactions() {
    const tx = await makeEvmCall(`${config.to}`, "100000000");
    const txDeploy = await makeEvmDeploy(ConsensusAbi, 1);
    const response = await postTransactions(config.peer, [
        tx.serialized.toString("hex"),
        txDeploy.serialized.toString("hex"),
    ]);

    console.log("broadcastTransactions", { txs: [tx.hash, txDeploy.hash], response: JSON.stringify(response) });
    broadcastedTransactions.push(tx.hash, txDeploy.hash);
}

const makeEvmCall = async (to, amount) => {
    const app = await getApplication();

    const addressFactory = app.getTagged(Identifiers.Cryptography.Identity.Address.Factory, "type", "wallet");
    const senderAddress = await addressFactory.fromMnemonic(config.senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(21000)
        .payload("")
        .recipientAddress(to)
        .value(amount)
        .nonce(walletNonce.toString());

    const signed = await builder.sign(config.senderPassphrase);

    return signed.build();
};

const makeEvmDeploy = async (abi, nonceOffset = 0) => {
    const app = await getApplication();

    const addressFactory = app.getTagged(Identifiers.Cryptography.Identity.Address.Factory, "type", "wallet");
    const senderAddress = await addressFactory.fromMnemonic(config.senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(4_000_000)
        .payload(abi.bytecode.object.slice(2))
        .nonce((walletNonce + nonceOffset).toString());

    const signed = await builder.sign(config.senderPassphrase);

    return signed.build();
};
