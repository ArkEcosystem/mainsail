import { Contracts } from "@mainsail/contracts";
import { ethers } from "ethers";

import { describe, Sandbox } from "../../test-framework";
import { abi, bytecode } from "../test/fixtures/MainsailERC20.json";
import { wallets } from "../test/fixtures/wallets";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Instance } from "./instance";

describe<{
	sandbox: Sandbox;
	instance: Contracts.Evm.Instance;
}>("Instance", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.instance = context.sandbox.app.resolve<Contracts.Evm.Instance>(Instance);
	});

	it("should deploy contract successfully", async ({ instance }) => {
		const [sender] = wallets;

		const result = await instance.transact({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
		});

		assert.true(result.success);
		assert.equal(result.gasUsed, 964_156n);
		assert.equal(result.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");
	});

	it("should deploy, transfer and call balanceOf", async ({ instance }) => {
		const [sender, recipient] = wallets;

		const result = await instance.transact({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
		});

		assert.true(result.success);
		assert.equal(result.gasUsed, 964_156n);
		assert.equal(result.deployedContractAddress, "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a");

		const contractAddress = result.deployedContractAddress;
		assert.defined(contractAddress);

		const iface = new ethers.Interface(abi);
		const amount = ethers.parseEther("1000");

		const transferEncodedCall = iface.encodeFunctionData("transfer", [recipient.address, amount]);
		const transferResult = await instance.transact({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(transferEncodedCall)),
			recipient: contractAddress,
		});

		assert.true(transferResult.success);
		assert.equal(transferResult.gasUsed, 52_222n);

		const balanceOfEncodedCall = iface.encodeFunctionData("balanceOf", [recipient.address]);
		const balanceOfResult = await instance.view({
			caller: sender.address,
			data: Buffer.from(ethers.getBytes(balanceOfEncodedCall)),
			recipient: contractAddress,
		});

		assert.true(balanceOfResult.success);
		assert.equal(balanceOfResult.gasUsed, 24_295n);
	});

	it("should revert on invalid call", async ({ instance }) => {
		const [sender] = wallets;

		let result = await instance.transact({
			caller: sender.address,
			data: Buffer.from(bytecode.slice(2), "hex"),
		});

		const contractAddress = result.deployedContractAddress;
		assert.defined(contractAddress);

		result = await instance.transact({
			caller: sender.address,
			data: Buffer.from("0xdead", "hex"),
			recipient: contractAddress,
		});

		assert.false(result.success);
		assert.equal(result.gasUsed, 21_070n);
	});

	it("should throw on invalid tx context caller", async ({ instance }) => {
		await assert.rejects(
			async () =>
				await instance.transact({
					caller: "badsender_",
					data: Buffer.from(bytecode.slice(2), "hex"),
				}),
		);
	});
});
