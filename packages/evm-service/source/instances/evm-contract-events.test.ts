import { randomBytes } from "node:crypto";
import { Enums } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Evm } from "@mainsail/evm";
import { ConsensusAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { encodeFunctionData, getAddress, getContractAddress, zeroAddress } from "viem";

import { describe } from "@mainsail/test-runner";
import * as MainsailContractEvents from "../../test/fixtures/MainsailContractEvents.json";
import { wallets } from "../../test/fixtures/wallets";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";
import { setGracefulCleanup } from "tmp";

describe<{
	app: Application;
	evm: Evm;
}>("EvmInstance - contract events", ({ it, assert, afterAll, afterEach, beforeEach }) => {
	afterAll(() => setGracefulCleanup());

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.evm = new Evm({ path: context.app.dataPath("contract-events") });
	});

	afterEach(async (context) => {
		await context.evm.dispose();
	});

	const getRandomTxHash = () => Buffer.from(randomBytes(32)).toString("hex");

	const txConfig = {
		gasPrice: BigInt(0),
		specId: Enums.Evm.SpecId.OSAKA,
	};

	const blockContext: Omit<Contracts.Evm.BlockContext, "commitKey"> = {
		gasLimit: BigInt(10_000_000),
		timestamp: BigInt(12_345),
		validatorAddress: zeroAddress,
		prevrandao: Buffer.alloc(32),
	};

	const normalize = ({
		event,
		txHash,
		txIndex,
		voter,
		validator,
		addr,
		username,
		previousUsername,
		blsPublicKey,
	}: any) => ({ addr, blsPublicKey, event, previousUsername, txHash, txIndex, username, validator, voter });

	it("#commit - should return the decoded consensus and username contract events", async ({ evm }) => {
		const [sender, other] = wallets;
		const voter = getAddress(sender.address);
		const validator = getAddress(other.address);
		const blsPublicKey = "aa".repeat(48);

		const consensusContract = getContractAddress({ from: voter, nonce: 0n });
		const usernamesContract = getContractAddress({ from: voter, nonce: 1n });

		await evm.initializeGenesis({
			account: voter,
			deployerAccount: "0x0000000000000000000000000000000000000001",
			initialBlockNumber: 0n,
			initialSupply: 0n,
			usernameContract: usernamesContract,
			validatorContract: consensusContract,
		});

		// Block 0: deploy the two emitter contracts.
		let commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await evm.prepareNextCommit({ blockContext: { ...blockContext, commitKey } });

		for (const nonce of [0n, 1n]) {
			const { receipt } = await evm.process({
				commitKey,
				data: Buffer.from(MainsailContractEvents.bytecode.object.slice(2), "hex"),
				from: voter,
				gasLimit: BigInt(1_000_000),
				nonce,
				txHash: getRandomTxHash(),
				value: 0n,
				...txConfig,
			});
			assert.equal(receipt.status, 1);
		}

		const genesisResult = await evm.commit(commitKey);
		assert.empty(genesisResult.events);

		// Block 1: one transaction per contract, emitting every tracked event.
		commitKey = { blockNumber: BigInt(1), round: BigInt(0) };
		await evm.prepareNextCommit({ blockContext: { ...blockContext, commitKey } });

		const consensusTxHash = getRandomTxHash();
		const usernamesTxHash = getRandomTxHash();

		for (const [nonce, txHash, to, functionName, args] of [
			[2n, consensusTxHash, consensusContract, "emitConsensusEvents", [voter, validator, `0x${blsPublicKey}`]],
			[3n, usernamesTxHash, usernamesContract, "emitUsernameEvents", [voter]],
		] as const) {
			const { receipt } = await evm.process({
				commitKey,
				data: Buffer.from(
					encodeFunctionData({ abi: MainsailContractEvents.abi, args: [...args], functionName }).slice(2),
					"hex",
				),
				from: voter,
				gasLimit: BigInt(200_000),
				nonce,
				to,
				txHash,
				value: 0n,
				...txConfig,
			});
			assert.equal(receipt.status, 1);
		}

		const { dirtyAccounts, events } = await evm.commit(commitKey);

		assert.equal(
			events.map(normalize),
			[
				{ event: "Voted", txHash: consensusTxHash, txIndex: 0, validator, voter },
				{ event: "Unvoted", txHash: consensusTxHash, txIndex: 0, validator, voter },
				{ addr: voter, blsPublicKey, event: "ValidatorRegistered", txHash: consensusTxHash, txIndex: 0 },
				{ addr: voter, event: "ValidatorResigned", txHash: consensusTxHash, txIndex: 0 },
				{ addr: voter, blsPublicKey, event: "ValidatorUpdated", txHash: consensusTxHash, txIndex: 0 },
				{
					addr: voter,
					event: "UsernameRegistered",
					txHash: usernamesTxHash,
					txIndex: 1,
					username: "alice",
				},
				{
					addr: voter,
					event: "UsernameRegistered",
					previousUsername: "alice",
					txHash: usernamesTxHash,
					txIndex: 1,
					username: "bob",
				},
				{ addr: voter, event: "UsernameResigned", txHash: usernamesTxHash, txIndex: 1, username: "bob" },
			].map(normalize),
		);

		const senderUpdate = dirtyAccounts.find(({ address }) => address === voter);
		assert.defined(senderUpdate);
		assert.equal(senderUpdate!.unvote, validator);
		assert.undefined(senderUpdate!.vote);
		assert.undefined(senderUpdate!.username);
		assert.true(senderUpdate!.usernameResigned);
	});

	it("#commit - should return no events when genesis info is not initialized", async ({ evm }) => {
		const [sender] = wallets;
		const voter = getAddress(sender.address);

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await evm.prepareNextCommit({ blockContext: { ...blockContext, commitKey } });

		const { receipt } = await evm.process({
			commitKey,
			data: Buffer.from(MainsailContractEvents.bytecode.object.slice(2), "hex"),
			from: voter,
			gasLimit: BigInt(1_000_000),
			nonce: 0n,
			txHash: getRandomTxHash(),
			value: 0n,
			...txConfig,
		});
		assert.equal(receipt.status, 1);

		const emitterContract = getContractAddress({ from: voter, nonce: 0n });

		const { receipt: emitReceipt } = await evm.process({
			commitKey,
			data: Buffer.from(
				encodeFunctionData({
					abi: MainsailContractEvents.abi,
					args: [voter],
					functionName: "emitUsernameEvents",
				}).slice(2),
				"hex",
			),
			from: voter,
			gasLimit: BigInt(200_000),
			nonce: 1n,
			to: emitterContract,
			txHash: getRandomTxHash(),
			value: 0n,
			...txConfig,
		});
		assert.equal(emitReceipt.status, 1);

		// Without genesis info the contract addresses are unknown, so nothing decodes.
		const { events } = await evm.commit(commitKey);
		assert.empty(events);
	});

	it("#onCommit - should forward the contract events to the processable unit", async ({ app }) => {
		const instance = app.resolve<EvmInstance>(EvmInstance);

		try {
			const [sender] = wallets;
			const voter = getAddress(sender.address);
			const usernamesContract = getContractAddress({ from: voter, nonce: 0n });

			await instance.initializeGenesis({
				account: voter,
				deployerAccount: "0x0000000000000000000000000000000000000001",
				initialBlockNumber: 0n,
				initialSupply: 0n,
				usernameContract: usernamesContract,
				validatorContract: "0x0000000000000000000000000000000000000002",
			});

			const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
			await instance.prepareNextCommit({ blockContext: { ...blockContext, commitKey } });

			for (const [nonce, data, to] of [
				[0n, MainsailContractEvents.bytecode.object, undefined],
				[
					1n,
					encodeFunctionData({
						abi: MainsailContractEvents.abi,
						args: [voter],
						functionName: "emitUsernameEvents",
					}),
					usernamesContract,
				],
			] as const) {
				const { receipt } = await instance.process({
					commitKey,
					data: Buffer.from(data.slice(2), "hex"),
					from: voter,
					gasLimit: BigInt(1_000_000),
					nonce,
					to,
					txHash: getRandomTxHash(),
					value: 0n,
					...txConfig,
				});
				assert.equal(receipt.status, 1);
			}

			let capturedUpdates: Contracts.Evm.AccountUpdate[] | undefined;
			let capturedEvents: Contracts.Evm.ContractEvent[] | undefined;

			await instance.onCommit({
				blockNumber: commitKey.blockNumber,
				getBlock: () => ({ number: commitKey.blockNumber, round: commitKey.round }),
				round: commitKey.round,
				setAccountUpdates: (accounts: Contracts.Evm.AccountUpdate[]) => {
					capturedUpdates = accounts;
				},
				setContractEvents: (events: Contracts.Evm.ContractEvent[]) => {
					capturedEvents = events;
				},
			} as unknown as Contracts.Processor.ProcessableUnit);

			assert.defined(capturedUpdates);
			assert.equal(
				capturedEvents!.map((event) => ({ event: event.event, username: (event as any).username })),
				[
					{ event: "UsernameRegistered", username: "alice" },
					{ event: "UsernameRegistered", username: "bob" },
					{ event: "UsernameResigned", username: "bob" },
				],
			);
		} finally {
			await instance.dispose();
		}
	});

	it("fixture - should declare the exact event signatures of the deployed contracts", () => {
		const eventAbi = (abi: Record<string, unknown>[], name: string) => {
			const item = abi.find((entry) => entry.type === "event" && entry.name === name) as any;
			assert.defined(item);

			return {
				anonymous: item.anonymous ?? false,
				inputs: item.inputs.map(({ indexed, name: inputName, type }: any) => ({
					indexed,
					name: inputName,
					type,
				})),
				name: item.name,
			};
		};

		for (const [realAbi, eventNames] of [
			[ConsensusAbi.abi, ["Voted", "Unvoted", "ValidatorRegistered", "ValidatorResigned", "ValidatorUpdated"]],
			[UsernamesAbi.abi, ["UsernameRegistered", "UsernameResigned"]],
		] as [Record<string, unknown>[], string[]][]) {
			for (const eventName of eventNames) {
				assert.equal(
					eventAbi(MainsailContractEvents.abi as Record<string, unknown>[], eventName),
					eventAbi(realAbi, eventName),
				);
			}
		}
	});
});
