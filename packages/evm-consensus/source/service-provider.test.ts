import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { getCreateAddress } from "viem";

import { Identifiers as EvmConsensusIdentifiers } from "./identifiers.js";
import { ServiceProvider } from "./service-provider.js";

const DEPLOYER = "0x0000000000000000000000000000000000000001";

const genesisBlock = {
	block: {
		number: 0,
		proposer: "0xproposer",
		timestamp: 1000,
		transactions: [
			{ from: "0xproposer", value: "500" },
			{ from: "0xproposer", value: "300" },
			{ from: "0xsomebody", value: "999" }, // not from the generator -> excluded from supply
		],
	},
};

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", { genesisBlock });

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind the package services", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.ValidatorSet.Service));
		assert.true(app.isBound(EvmConsensusIdentifiers.Internal.ConsensusContractCaller));
		assert.true(app.isBound(Identifiers.Evm.ContractService.Consensus));
		assert.true(app.isBound(EvmConsensusIdentifiers.Internal.Deployer));
	});

	it("#register - should bind the deployer and deterministic contract addresses", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.equal(app.get(EvmConsensusIdentifiers.Internal.Addresses.Deployer), DEPLOYER);
		assert.equal(app.get(EvmConsensusIdentifiers.Contracts.Addresses.Consensus), getCreateAddress({ from: DEPLOYER, nonce: 1n }));
		assert.equal(app.get(EvmConsensusIdentifiers.Contracts.Addresses.Usernames), getCreateAddress({ from: DEPLOYER, nonce: 3n }));
		assert.equal(
			app.get(EvmConsensusIdentifiers.Contracts.Addresses.MultiPayment),
			getCreateAddress({ from: DEPLOYER, nonce: 5n }),
		);
	});

	it("#register - should build and bind the genesis info", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.equal(app.get(EvmConsensusIdentifiers.Internal.GenesisInfo), {
			account: "0xproposer",
			deployerAccount: DEPLOYER,
			initialBlockNumber: 0n,
			initialSupply: 800n, // 500 + 300, excluding the transaction not sent by the generator
			timestamp: 1000n,
			usernameContract: getCreateAddress({ from: DEPLOYER, nonce: 3n }),
			validatorContract: getCreateAddress({ from: DEPLOYER, nonce: 1n }),
		});
	});

	it("#boot - should run the deployer", async () => {
		const app = new Application();
		const deployer = { deploy: async () => {} };
		app.bind(EvmConsensusIdentifiers.Internal.Deployer).toConstantValue(deployer);
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ info: () => {} });

		const serviceProvider = app.resolve(ServiceProvider);
		const deploy = spy(deployer, "deploy");

		await serviceProvider.boot();

		deploy.calledOnce();
	});
});
