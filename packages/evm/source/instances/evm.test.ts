import { Contracts } from "@mainsail/contracts";
import { ethers } from "ethers";

import { describe, Sandbox } from "../../../test-framework/distribution";
import { abi, bytecode } from "../../test/fixtures/MainsailERC20.json";
import { wallets } from "../../test/fixtures/wallets";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";

describe<{
	sandbox: Sandbox;
	instance: Contracts.Evm.Instance;
}>("Instance", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.instance = context.sandbox.app.resolve<Contracts.Evm.Instance>(EvmInstance);
		await context.instance.setAutoCommit(true);
	});

	it("should deploy contract successfully", async ({ instance }) => {
		const [sender] = wallets;

		const { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
		});

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");
	});

	it("should deploy, transfer and call balanceOf", async ({ instance }) => {
		const [sender, recipient] = wallets;

		let { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
		});

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 964_156n);
		assert.equal(receipt.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");

		const contractAddress = receipt.deployedContractAddress;
		assert.defined(contractAddress);

		const iface = new ethers.Interface(abi);
		const amount = ethers.parseEther("1000");

		const transferEncodedCall = iface.encodeFunctionData("transfer", [recipient.address, amount]);
		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			recipient: contractAddress,
		}));

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 52_222n);

		const balanceOfEncodedCall = iface.encodeFunctionData("balanceOf", [recipient.address]);
		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(balanceOfEncodedCall)),
			recipient: contractAddress,
		}));

		assert.true(receipt.success);
		assert.equal(receipt.gasUsed, 24_295n);
	});

	it("should revert on invalid call", async ({ instance }) => {
		const [sender] = wallets;

		let { receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
		});

		const contractAddress = receipt.deployedContractAddress;
		assert.defined(contractAddress);

		({ receipt } = await instance.process({
			caller: sender.address,
			data: Buffer.from("0xdead", "hex"),
			recipient: contractAddress,
		}));

		assert.false(receipt.success);
		assert.equal(receipt.gasUsed, 21_070n);
	});

	it("should throw on invalid tx context caller", async ({ instance }) => {
		await assert.rejects(
			async () =>
				await instance.process({
					caller: "badsender_",
					data: Buffer.from(bytecode.slice(2), "hex"),
				}),
		);
	});
});
