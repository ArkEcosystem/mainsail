import { Contracts } from "@mainsail/contracts";
import { Evm } from "@mainsail/evm";
import { BigNumberish, ethers, randomBytes, ZeroAddress } from "ethers";

import { describe, Sandbox } from "../../../test-framework/distribution";
import * as MainsailERC20 from "../../test/fixtures/MainsailERC20.json";
import * as MainsailGlobals from "../../test/fixtures/MainsailGlobals.json";
import { wallets } from "../../test/fixtures/wallets";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";
import { setGracefulCleanup } from "tmp";

describe<{
	sandbox: Sandbox;
	instance: Contracts.Evm.Instance;
}>("Instance", ({ it, assert, afterAll, afterEach, beforeEach }) => {
	afterAll(() => setGracefulCleanup());

	afterEach(async (context) => {
		await context.sandbox.dispose();
		await context.instance.dispose();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.instance = context.sandbox.app.resolve<Contracts.Evm.Instance>(EvmInstance);
	});

	const deployConfig = {
		gasLimit: BigInt(1_000_000),
		gasPrice: BigInt(0),
		specId: Contracts.Evm.SpecId.SHANGHAI,
	};

	const transferConfig = {
		gasLimit: BigInt(60_000),
		gasPrice: BigInt(0),
		specId: Contracts.Evm.SpecId.SHANGHAI,
	};

	const blockContext: Omit<Contracts.Evm.BlockContext, "commitKey"> = {
		gasLimit: BigInt(10_000_000),
		timestamp: BigInt(12345),
		validatorAddress: ethers.ZeroAddress,
	};

	it("should deploy contract successfully", async ({ instance }) => {
		const [sender] = wallets;

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		const { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			blockContext: { ...blockContext, commitKey },
			txHash: getRandomTxHash(),
			...deployConfig,
		});

		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.contractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");
	});

	it("should call log hook", async ({ sandbox, instance }) => {
		let hookCalled = 0;

		const evm = new Evm({
			path: sandbox.app.dataPath("loghook"),
			logger: (level, message) => {
				//console.log("CALLED HOOK", { level, message, hookCalled });
				hookCalled++;
			},
		});

		assert.equal(hookCalled, 0);

		const commitKey = { commitKey: { blockNumber: 1n, round: 1n } };
		await evm.prepareNextCommit(commitKey);
		assert.equal(hookCalled, 0);

		for (let i = 0; i < 100; i++) {
			await evm.prepareNextCommit(commitKey);
		}

		await new Promise((resolve) => setTimeout(resolve, 1000)).then(() => evm.dispose());

		assert.equal(hookCalled, 100);
	});

	// Also see
	// https://docs.soliditylang.org/en/latest/units-and-global-variables.html#block-and-transaction-properties
	it("should correctly set global variables", async ({ instance }) => {
		const [validator, sender] = wallets;

		const iface = new ethers.Interface(MainsailGlobals.abi);

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		let { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailGlobals.bytecode.slice(2), "hex"),
			blockContext: { ...blockContext, commitKey },
			txHash: getRandomTxHash(),
			...deployConfig,
		});

		assert.equal(receipt.status, 1);
		assert.equal(receipt.contractAddress, "0x69230f08D82f095aCB9BE4B21043B502b712D3C1");
		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(0), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		const encodedCall = iface.encodeFunctionData("emitGlobals");
		({ receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 1n,
			data: Buffer.from(ethers.getBytes(encodedCall)),
			to: "0x69230f08D82f095aCB9BE4B21043B502b712D3C1",
			txHash: getRandomTxHash(),
			blockContext: {
				commitKey: { blockNumber: BigInt(1245), round: BigInt(0) },
				gasLimit: BigInt(12_000_000),
				timestamp: BigInt(123_456_789),
				validatorAddress: validator.address,
			},
			...transferConfig,
		}));

		const data = iface.decodeEventLog("GlobalData", receipt.logs[0].data)[0];

		// struct Globals {
		//     uint256 blockNumber;
		//     uint256 blockTimestamp;
		//     uint256 blockGasLimit;
		//     address blockCoinbase;
		//     uint256 blockDifficulty;
		//     uint256 txGasPrice;
		//     address txOrigin;
		// }

		assert.equal(data[0], 1245n);
		assert.equal(data[1], 123_456_789n);
		assert.equal(data[2], 12_000_000n);
		assert.equal(data[3], validator.address);
		assert.equal(data[4], 0n); // difficulty always 0
		assert.equal(data[5], 0n); // gas price always 0
		assert.equal(data[6], sender.address);
	});

	it("should deploy, transfer and and update balance correctly", async ({ instance }) => {
		const [sender, recipient] = wallets;

		let commitKey = { blockNumber: BigInt(0), round: BigInt(0) };

		await instance.prepareNextCommit({ commitKey });

		let { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...deployConfig,
		});

		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(0), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.contractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");

		const contractAddress = receipt.contractAddress;
		assert.defined(contractAddress);

		const iface = new ethers.Interface(MainsailERC20.abi);

		const balanceBefore = await getBalance(instance, contractAddress!, sender.address);
		assert.equal(ethers.parseEther("100000000"), balanceBefore);

		const amount = ethers.parseEther("1999");

		commitKey = { blockNumber: BigInt(1), round: BigInt(0) };

		await instance.prepareNextCommit({ commitKey });

		const transferEncodedCall = iface.encodeFunctionData("transfer", [recipient.address, amount]);
		({ receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 1n,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			to: contractAddress,
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...transferConfig,
		}));

		await instance.onCommit({
			blockNumber: BigInt(1),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(1), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, 52_222n);

		const balanceAfter = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(amount, balanceAfter);
	});

	it("should merge with cold wallet", async ({ instance }) => {
		const [sender, recipient] = wallets;
		const legacyAddress = "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt";

		let commitKey = { blockNumber: BigInt(0), round: BigInt(0) };

		const commit = async (commitKey) =>
			instance.onCommit({
				blockNumber: commitKey.blockNumber,
				round: commitKey.round,
				getBlock: () => ({
					header: { number: commitKey.blockNumber, round: commitKey.round },
				}),
				setAccountUpdates: () => {},
			} as any);

		// No legacy balance present yet
		let extendedInfo = await instance.getAccountInfoExtended(sender.address, legacyAddress);
		assert.equal(extendedInfo.balance, 0n);

		// Import legacy cold wallet with 10n balance
		await instance.prepareNextCommit({ commitKey });
		await instance.importLegacyColdWallets([
			{
				address: legacyAddress,
				balance: 10n,
				legacyAttributes: {},
			},
		]);
		await commit(commitKey);

		assert.undefined((await instance.getLegacyColdWallets(0n, 100n)).wallets[0].mergeInfo);

		extendedInfo = await instance.getAccountInfoExtended(sender.address, legacyAddress);
		assert.equal(extendedInfo.balance, 10n);
		extendedInfo = await instance.getAccountInfoExtended(sender.address, undefined);
		assert.equal(extendedInfo.balance, 0n);

		// Load without imported cold wallet (pre-merge)
		let info = await instance.getAccountInfo(sender.address);
		assert.equal(info.balance, 0n);

		// Perform tx from sender, to initiate a cold wallet merge
		commitKey = { blockNumber: BigInt(1), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		const txHash = getRandomTxHash();

		let receipt = await instance.process({
			from: sender.address,
			legacyAddress: legacyAddress,
			value: 0n,
			nonce: 0n,
			data: Buffer.alloc(0),
			to: recipient.address,
			txHash,
			blockContext: { ...blockContext, commitKey },
			...transferConfig,
		});
		assert.equal(receipt.receipt.status, 1);
		await commit(commitKey);

		// Legacy cold balance moved to native balance
		assert.equal((await instance.getLegacyColdWallets(0n, 100n)).wallets[0].mergeInfo, {
			address: sender.address,
			txHash: `0x${txHash}`,
		});

		extendedInfo = await instance.getAccountInfoExtended(sender.address, legacyAddress);
		assert.equal(extendedInfo.balance, 10n);
		extendedInfo = await instance.getAccountInfoExtended(sender.address, undefined);
		assert.equal(extendedInfo.balance, 10n);

		info = await instance.getAccountInfo(sender.address);
		assert.equal(info.balance, 10n);

		// Move all funds to different wallet
		commitKey = { blockNumber: BigInt(2), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });
		receipt = await instance.process({
			from: sender.address,
			value: 10n,
			nonce: 1n,
			data: Buffer.alloc(0),
			to: recipient.address,
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...transferConfig,
		});
		assert.equal(receipt.receipt.status, 1);
		await commit(commitKey);

		assert.equal((await instance.getLegacyColdWallets(0n, 100n)).wallets[0].mergeInfo, {
			address: sender.address,
			txHash: `0x${txHash}`,
		});

		// Sender depleted whole balance
		extendedInfo = await instance.getAccountInfoExtended(sender.address, legacyAddress);
		assert.equal(extendedInfo.balance, 0n);
		extendedInfo = await instance.getAccountInfoExtended(sender.address, undefined);
		assert.equal(extendedInfo.balance, 0n);

		info = await instance.getAccountInfo(sender.address);
		assert.equal(info.balance, 0n);

		// Recipient now has the original "legacy" balance
		const recipientExtendedInfo = await instance.getAccountInfoExtended(recipient.address, undefined);
		assert.equal(recipientExtendedInfo.balance, 10n);
		info = await instance.getAccountInfo(recipientExtendedInfo.address);
		assert.equal(info.balance, 10n);
	});

	it("should get legacy cold wallets", async ({ instance }) => {
		const legacyAddress = "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt";

		let commitKey = { blockNumber: BigInt(0), round: BigInt(0) };

		const commit = async (commitKey) =>
			instance.onCommit({
				blockNumber: commitKey.blockNumber,
				round: commitKey.round,
				getBlock: () => ({
					header: { number: commitKey.blockNumber, round: commitKey.round },
				}),
				setAccountUpdates: () => {},
			} as any);

		await instance.prepareNextCommit({ commitKey });
		await instance.importLegacyColdWallets([
			{
				address: legacyAddress,
				balance: 999n,
				legacyAttributes: {},
			},
		]);
		await commit(commitKey);

		let { wallets } = await instance.getLegacyColdWallets(0n, 100n);

		assert.equal(wallets, [
			{
				address: legacyAddress,
				balance: 999n,
				legacyAttributes: {},
			},
		]);

		({ wallets } = await instance.getLegacyColdWallets(1n, 100n));
		assert.empty(wallets);
	});

	it("should revert on invalid call", async ({ instance }) => {
		const [sender] = wallets;

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		let { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...deployConfig,
		});

		const contractAddress = receipt.contractAddress;
		assert.defined(contractAddress);

		({ receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 1n,
			data: Buffer.from("0xdead", "hex"),
			to: contractAddress,
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...transferConfig,
		}));

		assert.equal(receipt.status, 0);
		assert.equal(receipt.gasUsed, 21_070n);
	});

	it("should overwrite pending state if modified in different context", async ({ instance }) => {
		const [sender, recipient] = wallets;

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };

		await instance.prepareNextCommit({ commitKey });

		let { receipt } = await instance.process({
			blockContext: { ...blockContext, commitKey },
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			txHash: getRandomTxHash(),
			...deployConfig,
		});

		const contractAddress = receipt.contractAddress;
		assert.defined(contractAddress);

		await instance.onCommit({
			...commitKey,
			getBlock: () => ({
				header: { number: commitKey.blockNumber, round: commitKey.round },
			}),
			setAccountUpdates: () => {},
		} as any);

		//

		const iface = new ethers.Interface(MainsailERC20.abi);

		const commitKey1 = { blockNumber: BigInt(1), round: BigInt(0) };
		const commitKey2 = { blockNumber: BigInt(1), round: BigInt(1) };

		// Transfer 1 ARK (1,0)
		await assert.resolves(async () => {
			await instance.prepareNextCommit({ commitKey: commitKey1 });
			await instance.process({
				blockContext: { ...blockContext, commitKey: commitKey1 },
				value: 0n,
				nonce: 1n,
				from: sender.address,
				data: Buffer.from(
					ethers.getBytes(iface.encodeFunctionData("transfer", [recipient.address, ethers.parseEther("1")])),
				),
				to: contractAddress,
				txHash: getRandomTxHash(),
				...transferConfig,
			});
		});

		// Transfer 2 ARK (1,1)
		await assert.resolves(async () => {
			await instance.prepareNextCommit({ commitKey: commitKey2 });
			await instance.process({
				blockContext: { ...blockContext, commitKey: commitKey2 },
				value: 0n,
				nonce: 1n,
				from: sender.address,
				data: Buffer.from(
					ethers.getBytes(iface.encodeFunctionData("transfer", [recipient.address, ethers.parseEther("2")])),
				),
				to: contractAddress,
				txHash: getRandomTxHash(),
				...transferConfig,
			});
		});

		// Commit (1,0) succeeds
		await assert.resolves(async () =>
			instance.onCommit({
				...commitKey1,
				getBlock: () => ({
					header: { number: commitKey1.blockNumber, round: commitKey1.round },
				}),
				setAccountUpdates: () => {},
			} as any),
		);

		// Commit (1,1) fails since it was dropped
		await assert.rejects(async () => {
			await instance.onCommit({
				...commitKey2,
				getBlock: () => ({
					header: { number: commitKey2.blockNumber, round: commitKey2.round },
				}),
				setAccountUpdates: () => {},
			} as any);
		}, "assertion failed: self.pending_commits.contains_key(&commit_key)");

		// Balance updated correctly
		const balance = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(ethers.parseEther("1"), balance);
	});

	it("should not throw when commit is empty", async ({ instance }) => {
		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		await assert.resolves(
			async () =>
				await instance.onCommit({
					blockNumber: 0,
					round: 0,
					getBlock: () => ({
						header: { number: 0, round: 0 },
					}),
					setAccountUpdates: () => {},
				} as any),
		);
	});

	it("should throw on invalid tx context from", async ({ instance }) => {
		await assert.rejects(
			async () =>
				await instance.process({
					from: "badsender_",
					value: 0n,
					nonce: 0n,
					data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
					blockContext: { ...blockContext, commitKey: { blockNumber: BigInt(0), round: BigInt(0) } },
					txHash: getRandomTxHash(),
					...deployConfig,
				}),
		);
	});

	it("should panic when passing non-existent tx hash for committed receipt", async ({ instance }) => {
		const [sender] = wallets;

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		const txHash = getRandomTxHash();

		await instance.prepareNextCommit({ commitKey });

		await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			blockContext: { ...blockContext, commitKey },
			txHash,
			...deployConfig,
		});

		await instance.onCommit({
			...commitKey,
			getBlock: () => ({
				header: { number: commitKey.blockNumber, round: commitKey.round },
			}),
			setAccountUpdates: () => {},
		} as any);

		const randomTxHash = getRandomTxHash();

		await assert.rejects(async () => {
			await instance.process({
				from: sender.address,
				value: 0n,
				nonce: 0n,
				data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
				blockContext: { ...blockContext, commitKey },
				txHash: randomTxHash,
				...deployConfig,
			});
		}, "assertion failed: !committed");
	});

	it("should deploy, transfer multipe times and update balance correctly", async ({ instance }) => {
		const [sender, recipient] = wallets;

		let commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		let { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			blockContext: { ...blockContext, commitKey },
			txHash: getRandomTxHash(),
			...deployConfig,
		});

		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(0), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.contractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");

		const contractAddress = receipt.contractAddress;
		assert.defined(contractAddress);

		const iface = new ethers.Interface(MainsailERC20.abi);
		const amount = ethers.parseEther("1999");

		commitKey = { blockNumber: BigInt(1), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		const transferEncodedCall = iface.encodeFunctionData("transfer", [recipient.address, amount]);
		({ receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 1n,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			to: contractAddress,
			blockContext: { ...blockContext, commitKey },
			txHash: getRandomTxHash(),
			...transferConfig,
		}));

		({ receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 2n,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			to: contractAddress,
			blockContext: { ...blockContext, commitKey },
			txHash: getRandomTxHash(),
			...transferConfig,
		}));

		({ receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 3n,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			to: contractAddress,
			blockContext: { ...blockContext, commitKey },
			txHash: getRandomTxHash(),
			...transferConfig,
		}));

		// not updated yet
		const balanceBefore = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(ethers.parseEther("0"), balanceBefore);

		await instance.onCommit({
			blockNumber: BigInt(1),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(1), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		// Balance updated correctly
		const balanceAfteer = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(ethers.parseEther("5997"), balanceAfteer);
	});

	it("should revert transaction if it exceeds gas limit", async ({ instance }) => {
		const [sender] = wallets;

		await assert.rejects(
			async () =>
				instance.process({
					from: sender.address,
					value: 0n,
					nonce: 0n,
					data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
					blockContext: { ...blockContext, commitKey: { blockNumber: BigInt(0), round: BigInt(0) } },
					txHash: getRandomTxHash(),
					gasLimit: 30_000n,
					gasPrice: 5n,
					specId: Contracts.Evm.SpecId.SHANGHAI,
				}),
			"transaction validation error: call gas cost (137330) exceeds the gas limit (30000)",
		);
	});

	it("should reject invalid specId", async ({ instance }) => {
		const [sender] = wallets;

		await assert.rejects(
			async () =>
				instance.process({
					from: sender.address,
					value: 0n,
					nonce: 0n,
					data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
					blockContext: { ...blockContext, commitKey: { blockNumber: BigInt(0), round: BigInt(0) } },
					txHash: getRandomTxHash(),
					gasLimit: 30_000n,
					gasPrice: 5n,
					specId: "asdf" as unknown as Contracts.Evm.SpecId,
				}),
			"invalid spec_id",
		);
	});

	it("should return state hash", async ({ instance }) => {
		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		const hash = await instance.stateHash(
			commitKey,
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.equal(hash, "0722d8002560934d7004b8b849101024bf7ec2aaa2c3396f7292d4ac8cdae5ab");
	});

	it("should return logs bloom", async ({ instance }) => {
		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		const logsBloom = await instance.logsBloom(commitKey);
		assert.equal(logsBloom, "0".repeat(512));
	});

	it("should return code", async ({ instance }) => {
		const [sender] = wallets;

		// empty
		let code = await instance.codeAt(sender.address);
		assert.equal(code, "0x");

		// empty
		code = await instance.codeAt(ethers.ZeroAddress);
		assert.equal(code, "0x");

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		// deployed code
		const { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...deployConfig,
		});

		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(0), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		code = await instance.codeAt(receipt.contractAddress!);
		assert.equal(code.slice(0, 16), MainsailERC20.bytecode.slice(0, 16));
	});

	it("should panic when transferring value without funds", async ({ instance }) => {
		const [sender] = wallets;

		await assert.rejects(
			async () =>
				await instance.process({
					from: sender.address,
					value: 2n,
					nonce: 0n,
					data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
					txHash: getRandomTxHash(),
					blockContext: { ...blockContext, commitKey: { blockNumber: BigInt(0), round: BigInt(0) } },
					...deployConfig,
				}),
			"transaction validation error: lack of funds (0) for max fee (2)",
		);
	});

	it("should throw when nonce is wrong", async ({ instance }) => {
		const [sender] = wallets;

		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		await assert.resolves(
			async () =>
				await instance.process({
					from: sender.address,
					value: 0n,
					nonce: 0n,
					data: Buffer.from("00", "hex"),
					txHash: getRandomTxHash(),
					blockContext: { ...blockContext, commitKey },
					...deployConfig,
				}),
		);

		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(0), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		await assert.rejects(
			async () =>
				await instance.process({
					from: sender.address,
					value: 0n,
					nonce: 2n, // should be 1
					data: Buffer.from("00", "hex"),
					txHash: getRandomTxHash(),
					blockContext: { ...blockContext, commitKey: { blockNumber: BigInt(1), round: BigInt(0) } },
					...deployConfig,
				}),
			"transaction validation error: nonce 2 too high, expected 1",
		);
	});

	it("should return storage", async ({ instance }) => {
		const [sender] = wallets;

		// empty
		let slot = await instance.storageAt(sender.address, BigInt(0));
		assert.equal(slot, ethers.ZeroHash);

		// deploy erc20
		const commitKey = { blockNumber: BigInt(0), round: BigInt(0) };
		await instance.prepareNextCommit({ commitKey });

		const { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...deployConfig,
		});

		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(0), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		// look up slot containing user balance
		//
		// - slot of balance mapping is '0' (depends on code layout, but here it's a OpenZeppelin ERC20 contract)
		// - calculate storage key by concatenating padded address and slot number
		const storageKey = ethers.keccak256(
			ethers.concat([ethers.zeroPadValue(sender.address, 32), ethers.zeroPadValue(ethers.toBeHex(0, 32), 32)]),
		);

		slot = await instance.storageAt(receipt.contractAddress!, BigInt(storageKey));

		assert.equal(slot, "0x00000000000000000000000000000000000000000052b7d2dcc80cd2e4000000");

		const balance = ethers.toBigInt(slot);
		assert.equal(balance, ethers.parseEther("100000000"));
	});

	it("should preverify transaction", async ({ instance }) => {
		const [sender, recipient] = wallets;

		const initialSupply = ethers.parseEther("100");

		await instance.initializeGenesis({
			account: sender.address,
			initialSupply,
			initialBlockNumber: 0n,
			deployerAccount: ethers.ZeroAddress,
			usernameContract: ethers.ZeroAddress,
			validatorContract: ethers.ZeroAddress,
		});

		const ctx = {
			nonce: 0n,
			data: Buffer.alloc(0),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey: { blockNumber: BigInt(0), round: BigInt(0) } },
			specId: Contracts.Evm.SpecId.SHANGHAI,
		};

		// Succeeds
		let result = await instance.preverifyTransaction({
			...ctx,
			from: sender.address,
			to: recipient.address,
			value: initialSupply - 21_000n * ethers.parseUnits("5", "gwei"),
			data: Buffer.alloc(0),
			gasLimit: 21_000n,
			gasPrice: 5n,
			blockGasLimit: 10_000_000n,
		});

		assert.equal(result, { success: true, initialGasUsed: 21000n });

		// Fails
		result = await instance.preverifyTransaction({
			...ctx,
			from: sender.address,
			to: undefined,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			gasLimit: 21_000n,
			gasPrice: 5n,
			blockGasLimit: 10_000_000n,
		});

		assert.equal(result, {
			success: false,
			initialGasUsed: 0n,
			error: "preverify failed: call gas cost (137330) exceeds the gas limit (21000)",
		});
	});

	it("should rollback contract deployment ", async ({ instance }) => {
		const [sender] = wallets;

		let commitKey = { blockNumber: BigInt(1), round: BigInt(0) };

		await instance.prepareNextCommit({ commitKey });

		await instance.snapshot(commitKey);

		let { receipt } = await instance.process({
			from: sender.address,
			value: 0n,
			nonce: 0n,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...deployConfig,
		});

		assert.equal(receipt.status, 1);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.contractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");

		await instance.rollback(commitKey);

		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(1), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		const contractAddress = receipt.contractAddress;
		assert.defined(contractAddress);

		// Contract not deployed due to rollback
		assert.equal(await instance.codeAt(contractAddress!), "0x");
	});

	it("should snapshot and rollback pending commit ", async ({ instance }) => {
		const [sender, recipient] = wallets;

		let commitKey = { blockNumber: BigInt(1), round: BigInt(0) };

		await instance.initializeGenesis({
			account: sender.address,
			initialSupply: 1000000n,
			initialBlockNumber: 0n,
			deployerAccount: ethers.ZeroAddress,
			usernameContract: ethers.ZeroAddress,
			validatorContract: ethers.ZeroAddress,
		});

		const senderAccountBefore = await instance.getAccountInfo(sender.address);
		const recipientAccountBefore = await instance.getAccountInfo(recipient.address);
		const zeroAccountBefore = await instance.getAccountInfo(ZeroAddress);

		await instance.prepareNextCommit({ commitKey });

		// TX 1: Send funds to `recipient`
		// - snapshot -
		// TX 2: Move funds from `recipient` to third wallet
		// - rollback to TX 1 -

		await instance.process({
			from: sender.address,
			to: recipient.address,
			value: 100n,
			nonce: 0n,
			data: Buffer.alloc(0),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...deployConfig,
		});
		await instance.snapshot(commitKey);

		await instance.process({
			from: recipient.address,
			to: ZeroAddress,
			value: 50n,
			nonce: 0n,
			data: Buffer.alloc(0),
			txHash: getRandomTxHash(),
			blockContext: { ...blockContext, commitKey },
			...deployConfig,
		});

		await instance.rollback(commitKey);

		await instance.onCommit({
			blockNumber: BigInt(0),
			round: BigInt(0),
			getBlock: () => ({
				header: { number: BigInt(1), round: BigInt(0) },
			}),
			setAccountUpdates: () => {},
		} as any);

		//
		const senderAccountAfter = await instance.getAccountInfo(sender.address);
		const recipientAccountAfter = await instance.getAccountInfo(recipient.address);
		const zeroAccountAfter = await instance.getAccountInfo(ZeroAddress);

		//console.log(senderAccountAfter, recipientAccountAfter, zeroAccountAfter);

		assert.equal(senderAccountAfter.balance, senderAccountBefore.balance - 100n);
		assert.equal(recipientAccountAfter.balance, recipientAccountBefore.balance + 100n);
		assert.equal(zeroAccountBefore.balance, zeroAccountAfter.balance);
	});
});

const getRandomTxHash = () => Buffer.from(randomBytes(32)).toString("hex");

const getBalance = async (
	instance: Contracts.Evm.Instance,
	contractAddress: string,
	walletAddress: string,
): Promise<BigNumberish> => {
	const iface = new ethers.Interface(MainsailERC20.abi);
	const balanceOf = iface.encodeFunctionData("balanceOf", [walletAddress]);

	const { output } = await instance.view({
		from: ethers.ZeroAddress,
		data: Buffer.from(ethers.getBytes(balanceOf)),
		to: contractAddress!,
		specId: Contracts.Evm.SpecId.SHANGHAI,
	});

	if (output?.byteLength === 0) {
		return 0n;
	}

	const [balance] = iface.decodeFunctionResult("balanceOf", output!);
	return balance;
};
