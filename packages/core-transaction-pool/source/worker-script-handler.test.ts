import { Generators, describe } from "@arkecosystem/core-test-framework";
import { WorkerScriptHandler } from "./worker-script-handler";
import { Identities, Managers, Transactions } from "@arkecosystem/crypto";

describe("WorkerScriptHandler", ({ it, assert }) => {
	it("setConfig - should set crypto configuration", () => {
		const config = Generators.generateCryptoConfigRaw();
		const workerScriptHandler = new WorkerScriptHandler();

		workerScriptHandler.setConfig(config);

		assert.equal(Managers.configManager.get("genesisBlock.payloadHash"), config.genesisBlock.payloadHash);
	});

	it("setHeight - should set height", () => {
		const workerScriptHandler = new WorkerScriptHandler();

		workerScriptHandler.setHeight(100);

		assert.equal(Managers.configManager.getHeight(), 100);
	});

	it("getTransactionFromData - should return serialized transaction and its id", async () => {
		const workerScriptHandler = new WorkerScriptHandler();

		const transaction = Transactions.BuilderFactory.transfer()
			.version(2)
			.amount("100")
			.recipientId(Identities.Address.fromPassphrase("recipient's secret"))
			.nonce("1")
			.sign("sender's secret")
			.build();

		const result = await workerScriptHandler.getTransactionFromData(transaction.data);

		assert.equal(result, {
			id: transaction.id,
			serialized: transaction.serialized.toString("hex"),
			isVerified: true,
		});
	});
});
