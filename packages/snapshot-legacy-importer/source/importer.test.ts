import { Enums, Identifiers } from "@mainsail/constants";
import { ConsensusAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { Application } from "@mainsail/kernel";
import { Interfaces } from "@mainsail/snapshot-legacy-exporter";
import { describe } from "@mainsail/test-runner";
import { createHash } from "node:crypto";
import { decodeFunctionData } from "viem";

import { Importer } from "./importer";

const resignedDelegate: Interfaces.LegacyWallet = {
	arkAddress: "DL5EnAoio7pk1ej4DCzLmFL7Kofy4thfzF",
	attributes: {
		delegate: {
			forgedFees: "10000000",
			forgedRewards: "20000000000",
			producedBlocks: 100,
			resigned: true,
			username: "resigned_delegate",
			voteBalance: "1000000000000",
		},
	},
	balance: "2500000000000",
	ethAddress: "0x096ABc14423A81dE39605ee11d5CbB4Faf9eD573",
	legacyNonce: "3",
	publicKey: "03306f59b7faa936f4e39773ff2cf48c70e56eb39ac152fcc59e55aee6f940fcc9",
};

const activeDelegate: Interfaces.LegacyWallet = {
	arkAddress: "D5z1QbdzXuMCC2uZzjUdCkj2phsiBuDQqu",
	attributes: {
		delegate: {
			forgedFees: "5000000",
			forgedRewards: "10000000000",
			producedBlocks: 50,
			rank: 1,
			username: "active_delegate",
			voteBalance: "0",
		},
	},
	balance: "1500000000000",
	ethAddress: "0x0B83f026d0E2293Fb35DBABE74F8C6CB40520497",
	legacyNonce: "2",
	publicKey: "02d58271bd0c213e64760d6e65d32e74f160eb49ca6372afdc2c976f2f5cabe1e5",
};

const voter: Interfaces.LegacyWallet = {
	arkAddress: "DMYQb9DvggWCQYBWgazjuyUSBZHFSxGHHb",
	attributes: { vote: resignedDelegate.publicKey },
	balance: "1000000000000",
	ethAddress: "0x91AF936e5af7982784AF3315ccdaFA85dA7877A9",
	legacyNonce: "1",
	publicKey: "02083c2450547fb398b1189403867db37b3e84d35b3fc62d88376e482939d69078",
};

const consensusContractAddress = "0x535B3D7A252fa034Ed71F0C53ec0C6F784cB64E1";

const makeSnapshot = (wallets: Interfaces.LegacyWallet[]): Interfaces.LegacySnapshot => {
	const chainTip = { hash: "9525c5e676b4e85ee67a4100bd660150e920f65427f16b096db610966ef5c225", number: "1000" };

	const hash = createHash("sha256");
	hash.update(JSON.stringify(chainTip));
	for (const wallet of wallets) {
		hash.update(JSON.stringify(wallet));
	}

	return { chainTip, hash: hash.digest("hex"), wallets };
};

describe<{
	app: Application;
	importer: Importer;
	evm: Record<string, (...arguments_: any[]) => Promise<unknown>>;
	fileSystem: { readJSONSync: () => unknown };
}>("Importer", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.fileSystem = { readJSONSync: () => undefined };
		context.evm = {
			getAccountInfo: async () => ({ balance: 0n, nonce: 0n }),
			importAccountInfos: async () => {},
			importLegacyColdWallets: async () => {},
			prepareNextCommit: async () => {},
			process: async () => ({ receipt: { status: 1 } }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue(context.fileSystem);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {}, info: () => {} });
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getMilestone: () => ({ evmSpec: Enums.Evm.SpecId.OSAKA }),
		});
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);
		context.app
			.bind(Identifiers.EvmConsensus.DeployerAddress)
			.toConstantValue("0x0000000000000000000000000000000000000001");
		context.app.bind(Identifiers.EvmConsensus.Contracts.Consensus).toConstantValue(consensusContractAddress);
		context.app
			.bind(Identifiers.EvmConsensus.Contracts.Usernames)
			.toConstantValue("0x2c1DE3b4Dbb4aDebEbB5dcECAe825bE2a9fc6eb6");
		context.app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue({
			sha256: (data: Buffer) => createHash("sha256").update(data).digest(),
		});

		context.importer = context.app.resolve(Importer);
	});

	it("should read V3's resigned flag", async ({ importer, fileSystem }) => {
		fileSystem.readJSONSync = () => makeSnapshot([resignedDelegate, activeDelegate, voter]);

		await importer.prepare("snapshot.json");

		assert.equal(
			importer.validators.map(({ username, isResigned }) => ({ isResigned, username })),
			[
				{ isResigned: true, username: "resigned_delegate" },
				{ isResigned: false, username: "active_delegate" },
			],
		);
	});

	it("should import a resigned delegate as resigned and keep its votes", async ({ importer, evm, fileSystem }) => {
		fileSystem.readJSONSync = () => makeSnapshot([resignedDelegate, activeDelegate, voter]);
		const process = spy(evm, "process");

		await importer.prepare("snapshot.json");
		await importer.import({
			commitKey: { blockHash: "0".repeat(64), blockNumber: 1001n, round: 0n },
			timestamp: 0,
		});

		process.calledTimes(5);

		const calls = Array.from({ length: 5 }, (_, index) => {
			const { data, to } = process.getCallArgs(index)[0];
			const { args, functionName } = decodeFunctionData({
				abi: to === consensusContractAddress ? ConsensusAbi.abi : UsernamesAbi.abi,
				data: `0x${data.toString("hex")}`,
			});

			return { args, functionName };
		});

		assert.equal(calls, [
			{ args: [resignedDelegate.ethAddress, true], functionName: "addValidator" },
			{ args: [activeDelegate.ethAddress, false], functionName: "addValidator" },
			{ args: [[voter.ethAddress], [resignedDelegate.ethAddress]], functionName: "addVotes" },
			{ args: [resignedDelegate.ethAddress, "resigned_delegate"], functionName: "addUsername" },
			{ args: [activeDelegate.ethAddress, "active_delegate"], functionName: "addUsername" },
		]);
	});
});
