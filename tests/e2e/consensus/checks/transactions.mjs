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
export const tokenContractValidations = [];

export async function broadcastTransactions() {
    // 1. Native transfer and 2 deploys in same block.
    const senderAddress = await getAddressFromPassphrase(config.senderPassphrase);
    const wallet1Nonce = await getWalletNonce(config.peer, senderAddress);

    const nativeTransfer = await makeEvmCall(`${config.to}`, "100000000", wallet1Nonce + 0);
    const { tx: tokenDeploy, contractAddress: tokenAddress } = await makeEvmDeploy(DARK20Abi, wallet1Nonce + 1);
    const { tx: tokenDeploy2, contractAddress: tokenAddress2 } = await makeEvmDeploy(DARK20Abi, wallet1Nonce + 2);
    const { tx: batchTransferDeploy, contractAddress: batchTransferAddress } = await makeEvmDeploy(ERC20BatchTransferAbi, wallet1Nonce + 3);
    const batch1 = [nativeTransfer, tokenDeploy, tokenDeploy2, batchTransferDeploy];
    let response = await postTransactions(config.peer, batch1.map(tx => tx.serialized.toString("hex")));
    console.log("Batch 1", { txs: batch1.map(tx => tx.hash), response: JSON.stringify(response) });
    broadcastedTransactions.push(...batch1.map(tx => tx.hash));
    await waitTransactionsFinalized(batch1.map(tx => tx.hash));


    // 2. Single token transfer with approval
    const tokenTransfer = await makeTokenTransfer(tokenAddress, config.tokenBeneficiary, parseEther("1"), wallet1Nonce + 4);

    const allowanceRecipient = await getAddressFromPassphrase(config.validatorSecrets[1]);
    const tokenApproval = await makeTokenApproval(tokenAddress, allowanceRecipient, parseEther("100"), wallet1Nonce + 5);
    const tokenBatchApproval = await makeTokenApproval(tokenAddress, batchTransferAddress, parseEther("10000"), wallet1Nonce + 6);
    const tokenBatchApproval2 = await makeTokenApproval(tokenAddress2, batchTransferAddress, parseEther("10000"), wallet1Nonce + 7);

    const batch2 = [tokenTransfer, tokenApproval, tokenBatchApproval, tokenBatchApproval2];
    response = await postTransactions(config.peer, batch2.map(tx => tx.serialized.toString("hex")));
    console.log("Batch 2", { txs: batch2.map(tx => tx.hash), response: JSON.stringify(response) });
    broadcastedTransactions.push(...batch2.map(tx => tx.hash));
    await waitTransactionsFinalized(batch2.map(tx => tx.hash));

    // 3. Token transfer from approved wallet
    const allowanceGiver = senderAddress;
    const allowanceRecipientNonce = await getWalletNonce(config.peer, allowanceRecipient);
    const tokenTransferFrom = await makeTokenTransferFrom(tokenAddress, allowanceGiver, config.tokenBeneficiary, parseEther("100"), allowanceRecipientNonce + 0, config.validatorSecrets[1]);
    const batch3 = [tokenTransferFrom];
    response = await postTransactions(config.peer, batch3.map(tx => tx.serialized.toString("hex")));
    console.log("Batch 3", { txs: batch3.map(tx => tx.hash), response: JSON.stringify(response) });
    broadcastedTransactions.push(...batch3.map(tx => tx.hash));
    await waitTransactionsFinalized(batch3.map(tx => tx.hash));

    // 4. Batch transfers via helper contract
    const tokenBatchTransferFrom = await makeBatchTokenTransfer(batchTransferAddress, [tokenAddress, tokenAddress2], [config.tokenBeneficiary, config.tokenBeneficiary], [parseEther("33"), parseEther("66")], wallet1Nonce + 8);
    const batch4 = [tokenBatchTransferFrom];
    response = await postTransactions(config.peer, batch4.map(tx => tx.serialized.toString("hex")));
    console.log("Batch 4", { txs: batch4.map(tx => tx.hash), response: JSON.stringify(response) });
    broadcastedTransactions.push(...batch4.map(tx => tx.hash));
    await waitTransactionsFinalized(batch4.map(tx => tx.hash));

    // For validation
    tokenContractValidations.push({
        address: tokenAddress,
        tokenBeneficiaryBalance: parseEther("134").toString()
    }, {
        address: tokenAddress2,
        tokenBeneficiaryBalance: parseEther("66").toString()
    })
}

const makeEvmCall = async (to, amount, nonce, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(21000)
        .payload("")
        .recipientAddress(to)
        .value(amount)
        .nonce(nonce.toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeTokenTransfer = async (tokenAddress, recipient, amount, nonce, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();

    const payload = encodeErc20Transfer(recipient, amount);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(200_000)
        .payload(payload)
        .recipientAddress(tokenAddress)
        .nonce(nonce.toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeTokenTransferFrom = async (tokenAddress, from, to, amount, nonce, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();

    const payload = encodeErc20TransferFrom(from, to, amount);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(200_000)
        .payload(payload)
        .recipientAddress(tokenAddress)
        .nonce(nonce.toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeBatchTokenTransfer = async (contract, tokenAddresses, recipients, amounts, nonce, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();

    const payload = encodeMultiBatchTransferFrom(tokenAddresses, recipients, amounts);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(500_000)
        .payload(payload)
        .recipientAddress(contract)
        .nonce(nonce.toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeTokenApproval = async (tokenAddress, recipient, amount, nonce, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();

    const payload = encodeErc20Approve(recipient, amount);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(60_000)
        .payload(payload)
        .recipientAddress(tokenAddress)
        .nonce(nonce.toString());

    const signed = await builder.sign(senderPassphrase);

    return signed.build();
};

const makeEvmDeploy = async (abi, nonce, senderPassphrase = config.senderPassphrase) => {
    const app = await getApplication();
    const senderAddress = await getAddressFromPassphrase(senderPassphrase);

    let builder = app
        .resolve(TransactionBuilder)
        .gasPrice(5000000000)
        .gasLimit(4_000_000)
        .payload(abi.bytecode.slice(2))
        .nonce(nonce.toString());

    const signed = await builder.sign(config.senderPassphrase);

    const tx = await signed.build();
    const contractAddress = getCreateAddress({ from: senderAddress, nonce });

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

const encodeMultiBatchTransferFrom = (tokens, recipients, amounts) =>
    encodeFunctionData({
        abi: ERC20BatchTransferAbi.abi,
        args: [tokens, recipients, amounts],
        functionName: "multiBatchTransferFrom",
    }).slice(2);

const getAddressFromPassphrase = async (passphrase) => {
    const app = await getApplication();

    const addressFactory = app.getTagged(Identifiers.Cryptography.Identity.Address.Factory, "type", "wallet");
    return addressFactory.fromMnemonic(passphrase);
}

const waitTransactionsFinalized = (txHashes) => {
    return new Promise((resolve) => {
        const result = new Set();

        const handler = (payload) => {

            for (const tx of payload.transactions) {
                if (txHashes.includes(tx.hash)) {
                    console.log("Found txHash", tx.hash);
                    result.add(tx.hash);
                }
            }

            if (result.size === txHashes.length) {
                eventEmitter.removeListener("block.applied", handler);

                resolve();
            }
        };

        eventEmitter.on("block.applied", handler);
    });
}
