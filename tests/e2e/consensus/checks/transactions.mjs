import { Identifiers } from "/mainsail/packages/constants/distribution/index.js";
import { TransactionBuilder } from "/mainsail/packages/crypto-transaction/distribution/index.js";
import { getApplication } from "./app.mjs";
import { eventEmitter } from "./events.mjs";
import { postTransactions, getWalletNonce } from "./client.mjs";
import { config } from "./config.mjs";
import DARK20Abi from "./abis/DARK20.json" with { type: "json" };
import ERC20BatchTransferAbi from "./abis/ERC20BatchTransfer.json" with { type: "json" };
import { encodeFunctionData, getCreateAddress, parseEther } from "viem";

export const broadcastedTransactions = [];

export async function broadcastTransactions() {
    // 1. Native transfer and 2 deploys in same block.
    const nativeTransfer = await makeEvmCall(`${config.to}`, "100000000", 0);
    const { tx: tokenDeploy, contractAddress: tokenAddress }  = await makeEvmDeploy(DARK20Abi, 1);
    const { tx: batchTransferDeploy, contractAddress: batchTransferAddress } = await makeEvmDeploy(ERC20BatchTransferAbi, 2);
    const batch1 = [nativeTransfer, tokenDeploy, batchTransferDeploy];
    let response = await postTransactions(config.peer, batch1.map(tx => tx.serialized.toString("hex")));
    console.log("Batch 1", { txs: batch1.map(tx => tx.hash), response: JSON.stringify(response) });
    broadcastedTransactions.push(...batch1.map(tx => tx.hash));
   // await waitBlock();

    // 2. Single token transfer with approval
    const tokenTransfer = await makeTokenTransfer(tokenAddress, config.tokenBeneficiary, parseEther("1"), 3);

    const allowanceGiver = await getAddressFromPassphrase(config.validatorSecrets[0]);
    const allowanceRecipient = await getAddressFromPassphrase(config.validatorSecrets[1]);
    const tokenApproval = await makeTokenApproval(tokenAddress, allowanceRecipient, parseEther("100", 4));
    const tokenTransferFrom = await makeTokenTransferFrom(tokenAddress, allowanceGiver, config.tokenBeneficiary, parseEther("100", 4), 5, config.validatorSecrets[1]);

    const batch2 = [tokenTransfer, tokenApproval, tokenTransferFrom];
    response = await postTransactions(config.peer, batch2.map(tx => tx.serialized.toString("hex")));
    console.log("Batch 2", { txs: batch2.map(tx => tx.hash), response: JSON.stringify(response) });
    broadcastedTransactions.push(...batch2.map(tx => tx.hash));    
//await waitBlock();
}

const makeEvmCall = async (to, amount, nonceOffset = 0, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();
    const senderAddress = await getAddressFromPassphrase(senderPassphrase);
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

const makeTokenTransfer = async (tokenAddress, recipient, amount, nonceOffset = 0, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();
    const senderAddress = await getAddressFromPassphrase(senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    const payload = encodeErc20Transfer(recipient, amount);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(200_000)
        .payload(payload)
        .recipientAddress(tokenAddress)
        .nonce((walletNonce + nonceOffset).toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeTokenTransferFrom = async (tokenAddress, from, to, amount, nonceOffset = 0, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();
    const senderAddress = await getAddressFromPassphrase(senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    const payload = encodeErc20TransferFrom(from, to, amount);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(200_000)
        .payload(payload)
        .recipientAddress(tokenAddress)
        .nonce((walletNonce + nonceOffset).toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeTokenApproval = async (tokenAddress, recipient, amount, nonceOffset = 0, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();
    const senderAddress = await getAddressFromPassphrase(senderPassphrase);
    const walletNonce = await getWalletNonce(config.peer, senderAddress);

    const payload = encodeErc20Approve(recipient, amount);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(60_000)
        .payload(payload)
        .recipientAddress(tokenAddress)
        .nonce((walletNonce + nonceOffset).toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeEvmDeploy = async (abi, nonceOffset = 0, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();
    const senderAddress = await getAddressFromPassphrase(senderPassphrase);
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

const encodeErc20TransferFrom = (from, to, amount) =>
    encodeFunctionData({
        abi: DARK20Abi.abi,
        args: [from, to, amount],
        functionName: "transferFrom",
    }).slice(2);


const encodeErc20Approve = (recipient, amount) =>
    encodeFunctionData({
        abi: DARK20Abi.abi,
        args: [recipient, amount],
        functionName: "approve",
    }).slice(2);

// const encodeErc20BatchTransfer = (recipient, amount) =>
//     encodeFunctionData({
//         abi: DARK20Abi.abi,
//         args: [recipient, amount],
//         functionName: "transfer",
//     }).slice(2);


const getAddressFromPassphrase = async (passphrase) => {
    const app = await getApplication();

    const addressFactory = app.getTagged(Identifiers.Cryptography.Identity.Address.Factory, "type", "wallet");
    return addressFactory.fromMnemonic(passphrase);
}

const waitBlock = (timeoutMs = 1000 * 60) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            eventEmitter.removeListener("block.applied", handler);
            reject(new Error("Timed out waiting for webhook"));
        }, timeoutMs);

        const handler = (payload) => {
            clearTimeout(timer);
            resolve(payload);
        };

        eventEmitter.once("block.applied", handler);
    });
}