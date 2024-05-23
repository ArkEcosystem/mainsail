import { Contracts } from "@mainsail/contracts";
import { BigNumberish, ethers } from "ethers";

import { describe, Sandbox } from "../../../test-framework/distribution";
import { abi, bytecode } from "../../test/fixtures/MainsailERC20.json";
import { wallets } from "../../test/fixtures/wallets";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";
import { setGracefulCleanup } from "tmp";

describe<{
	sandbox: Sandbox;
	instance: Contracts.Evm.Instance;
}>("Instance", ({ it, assert, afterAll, beforeEach }) => {
	afterAll(() => setGracefulCleanup());

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.instance = context.sandbox.app.resolve<Contracts.Evm.Instance>(EvmInstance);
	});

	it("should deploy contract successfully", async ({ instance }) => {
		const [sender] = wallets;

		const commitKey = { height: BigInt(0), round: BigInt(0) };
		const { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
			commitKey,
		});

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");
	});

	it("should deploy, transfer and and update balance correctly", async ({ instance }) => {
		const [sender, recipient] = wallets;

		let { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
			commitKey: { height: BigInt(0), round: BigInt(0) },
		});

		await instance.onCommit({ height: BigInt(0), round: BigInt(0) } as any);

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");

		const contractAddress = receipt.deployedContractAddress;
		assert.defined(contractAddress);

		const iface = new ethers.Interface(abi);

		const balanceBefore = await getBalance(instance, contractAddress!, sender.address);
		assert.equal(ethers.parseEther("100000000"), balanceBefore);

		const amount = ethers.parseEther("1999");

		const transferEncodedCall = iface.encodeFunctionData("transfer", [recipient.address, amount]);
		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			recipient: contractAddress,
			commitKey: { height: BigInt(1), round: BigInt(0) },
		}));

		await instance.onCommit({ height: BigInt(1), round: BigInt(0) } as any);

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 52_222n);

		const balanceAfter = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(amount, balanceAfter);
	});

	it("should revert on invalid call", async ({ instance }) => {
		const [sender] = wallets;

		let { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
			commitKey: { height: BigInt(0), round: BigInt(0) },
		});

		const contractAddress = receipt.deployedContractAddress;
		assert.defined(contractAddress);

		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from("0xdead", "hex"),
			recipient: contractAddress,
			commitKey: { height: BigInt(0), round: BigInt(0) },
		}));

		assert.false(receipt.success);
		assert.equal(receipt.gasUsed, 21_070n);
	});

	it("should overwrite pending state if modified in different context", async ({ instance }) => {
		const [sender, recipient] = wallets;

		const commitKey = { height: BigInt(0), round: BigInt(0) };

		let { receipt } = await instance.process({
			commitKey,
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
		});

		const contractAddress = receipt.deployedContractAddress;
		assert.defined(contractAddress);

		await instance.onCommit(commitKey as any);

		//

		const iface = new ethers.Interface(abi);

		const commitKey1 = { height: BigInt(1), round: BigInt(0) };
		const commitKey2 = { height: BigInt(1), round: BigInt(1) };

		// Transfer 1 ARK (1,0)
		await assert.resolves(
			async () =>
				await instance.process({
					commitKey: commitKey1,
					caller: sender.address,
					data: Buffer.from(
						ethers.getBytes(
							iface.encodeFunctionData("transfer", [recipient.address, ethers.parseEther("1")]),
						),
					),
					recipient: contractAddress,
				}),
		);

		// Transfer 2 ARK (1,1)
		await assert.resolves(async () => {
			await instance.process({
				commitKey: commitKey2,
				caller: sender.address,
				data: Buffer.from(
					ethers.getBytes(iface.encodeFunctionData("transfer", [recipient.address, ethers.parseEther("2")])),
				),
				recipient: contractAddress,
			});
		});

		// Commit (1,0) fails since it was overwritten
		await assert.rejects(async () => instance.onCommit(commitKey1 as any), "invalid commit key");
		// Commit (1,1) succeeds
		await assert.resolves(async () => instance.onCommit(commitKey2 as any));

		// Balance updated correctly
		const balance = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(ethers.parseEther("2"), balance);
	});

	it("should not throw when commit is empty", async ({ instance }) => {
		await assert.resolves(async () => await instance.onCommit({ height: 0, round: 0 } as any));
	});

	it("should throw on invalid tx context caller", async ({ instance }) => {
		await assert.rejects(
			async () =>
				await instance.process({
					caller: "badsender_",
					data: Buffer.from(bytecode.slice(2), "hex"),
					commitKey: { height: BigInt(0), round: BigInt(0) },
				}),
		);
	});

	it("should skip already committed commit key", async ({ instance }) => {
		const [sender] = wallets;

		const commitKey = { height: BigInt(0), round: BigInt(0) };
		let { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
			commitKey,
		});

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");
		assert.length(receipt.logs, 1);

		await instance.onCommit(commitKey as any);

		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
			commitKey,
		}));

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 0n);
		assert.null(receipt.logs);
	});

	it("should deploy, transfer multipe times and update balance correctly", async ({ instance }) => {
		const [sender, recipient] = wallets;

		let { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
			commitKey: { height: BigInt(0), round: BigInt(0) },
		});

		await instance.onCommit({ height: BigInt(0), round: BigInt(0) } as any);

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");

		const contractAddress = receipt.deployedContractAddress;
		assert.defined(contractAddress);

		const iface = new ethers.Interface(abi);
		const amount = ethers.parseEther("1999");

		const transferEncodedCall = iface.encodeFunctionData("transfer", [recipient.address, amount]);
		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			recipient: contractAddress,
			commitKey: { height: BigInt(1), round: BigInt(0) },
		}));

		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			recipient: contractAddress,
			commitKey: { height: BigInt(1), round: BigInt(0) },
		}));

		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			recipient: contractAddress,
			commitKey: { height: BigInt(1), round: BigInt(0) },
		}));

		// not updated yet
		const balanceBefore = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(ethers.parseEther("0"), balanceBefore);

		await instance.onCommit({ height: BigInt(1), round: BigInt(0) } as any);

		// Balance updated correctly
		const balanceAfteer = await getBalance(instance, contractAddress!, recipient.address);
		assert.equal(ethers.parseEther("5997"), balanceAfteer);
	});
});

const getBalance = async (
	instance: Contracts.Evm.Instance,
	contractAddress: string,
	walletAddress: string,
): Promise<BigNumberish> => {
	const iface = new ethers.Interface(abi);
	const balanceOf = iface.encodeFunctionData("balanceOf", [walletAddress]);

	const { output } = await instance.view({
		caller: ethers.ZeroAddress,
		data: Buffer.from(ethers.getBytes(balanceOf)),
		recipient: contractAddress!,
	});

	const [balance] = iface.decodeFunctionResult("balanceOf", output!);
	return balance;
};
