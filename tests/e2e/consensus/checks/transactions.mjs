import { Identifiers } from "/mainsail/packages/constants/distribution/index.js";
import { TransactionBuilder } from "/mainsail/packages/crypto-transaction/distribution/index.js";
import { getApplication } from "./app.mjs";
import { postTransactions, getWalletNonce } from "./client.mjs";
import { config } from "./config.mjs";
import DARK20Abi from "./abis/DARK20.json" with { type: "json" };
import ERC20BatchTransferAbi from "./abis/ERC20BatchTransfer.json" with { type: "json" };
import { encodeFunctionData, getCreateAddress, parseEther } from "viem";

export const broadcastedTransactions = [];

export async function broadcastTransactions() {
    const nativeTransfer = await makeEvmCall(`${config.to}`, "100000000", 0);
    const { tx: tokenDeploy, contractAddress: tokenAddress }  = await makeEvmDeploy(DARK20Abi, 1);
    const { tx: batchTransferDeploy, contractAddress: batchTransferAddress } = await makeEvmDeploy(ERC20BatchTransferAbi, 2);

    const tokenTransfer = await makeTokenTransfer(tokenAddress, config.tokenBeneficiary, parseEther("1"), 3);

    const txs = [nativeTransfer, tokenDeploy, batchTransferDeploy, tokenTransfer];

    const response = await postTransactions(config.peer, txs.map(tx => tx.serialized.toString("hex")));

    console.log("broadcastTransactions", { txs: txs.map(tx => tx.hash), response: JSON.stringify(response) });
    broadcastedTransactions.push(...txs.map(tx => tx.hash));
}

const makeEvmCall = async (to, amount, nonceOffset = 0) => {
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
        .nonce((walletNonce + nonceOffset).toString());

    const signed = await builder.sign(config.senderPassphrase);

    return signed.build();
};

const makeTokenTransfer = async (tokenAddress, recipient, amount, nonceOffset = 0) => {
    const app = await getApplication();

    const addressFactory = app.getTagged(Identifiers.Cryptography.Identity.Address.Factory, "type", "wallet");
    const senderAddress = await addressFactory.fromMnemonic(config.senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    const payload = encodeErc20Transfer(recipient, amount);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(200_000)
        .payload(payload)
        .recipientAddress(tokenAddress)
        .nonce((walletNonce + nonceOffset).toString());

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
        .payload(abi.bytecode.slice(2))
        .nonce((walletNonce + nonceOffset).toString());

    const signed = await builder.sign(config.senderPassphrase);

    const tx = await signed.build();
    const contractAddress = getCreateAddress({ from: senderAddress, nonce: walletNonce + nonceOffset });

    return { tx, contractAddress };
};

const encodeErc20Transfer = (recipient, amount) =>
    encodeFunctionData({
        abi: DARK20Abi.abi,
        args: [recipient, amount],
        functionName: "transfer",
    }).slice(2);

// const encodeErc20BatchTransfer = (recipient, amount) =>
//     encodeFunctionData({
//         abi: DARK20Abi.abi,
//         args: [recipient, amount],
//         functionName: "transfer",
//     }).slice(2);
