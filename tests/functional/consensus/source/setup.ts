import { ServiceProvider as Consensus } from "@mainsail/consensus";
import { Identifiers } from "@mainsail/contracts";
import { ServiceProvider as CryptoAddressBeach32m } from "@mainsail/crypto-address-bech32m";
import { ServiceProvider as CryptoBlock } from "@mainsail/crypto-block";
import { ServiceProvider as CryptoCommit } from "@mainsail/crypto-commit";
import { ServiceProvider as CryptoConfig } from "@mainsail/crypto-config";
import { ServiceProvider as CryptoConsensusBls } from "@mainsail/crypto-consensus-bls12-381";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as CryptoKeyPairSchnorr } from "@mainsail/crypto-key-pair-schnorr";
import { ServiceProvider as CryptoMessages } from "@mainsail/crypto-messages";
import { ServiceProvider as CryptoSignatureSchnorr } from "@mainsail/crypto-signature-schnorr";
import { ServiceProvider as CryptoValidation } from "@mainsail/crypto-validation";
import { ServiceProvider as CryptoWif } from "@mainsail/crypto-wif";
import { ServiceProvider as Database } from "@mainsail/database";
import { Bootstrap } from "@mainsail/kernel";
import { ServiceProvider as Processor } from "@mainsail/processor";
import { ServiceProvider as Proposer } from "@mainsail/proposer";
import { ServiceProvider as Serializer } from "@mainsail/serializer";
import { ServiceProvider as State } from "@mainsail/state";
import { Sandbox } from "@mainsail/test-framework";
import { ServiceProvider as TransactionPool } from "@mainsail/transaction-pool";
import { ServiceProvider as Transactions } from "@mainsail/transactions";
import { ServiceProvider as Validation } from "@mainsail/validation";
import { ServiceProvider as Validator } from "@mainsail/validator";

// TODO: Move to contracts
type Bootstrapper = {
	bootstrap: () => Promise<void>;
};

export const setup = async () => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
	sandbox.app.bind(Identifiers.Config.Flags).toConstantValue({});
	sandbox.app.bind(Identifiers.Config.Plugins).toConstantValue({});

	// TODO: Register event dispatcher

	await sandbox.app.resolve<Bootstrapper>(Bootstrap.RegisterBaseServiceProviders).bootstrap();
	await sandbox.app.resolve<Bootstrapper>(Bootstrap.RegisterErrorHandler).bootstrap();
	await sandbox.app.resolve<Bootstrapper>(Bootstrap.RegisterBaseConfiguration).bootstrap();
	// await sandbox.app.resolve<Bootstrapper>(Bootstrap.RegisterBaseBindings).bootstrap();

	sandbox.app.bind("path.data").toConstantValue("/home/ubuntu/mainsail/tests/functional/consensus/paths/data");
	sandbox.app.bind("path.config").toConstantValue("/home/ubuntu/mainsail/tests/functional/consensus/paths/config");
	sandbox.app.bind("path.cache").toConstantValue("");
	sandbox.app.bind("path.log").toConstantValue("");
	sandbox.app.bind("path.temp").toConstantValue("");

	await sandbox.app.resolve<Bootstrapper>(Bootstrap.LoadEnvironmentVariables).bootstrap();
	await sandbox.app.resolve<Bootstrapper>(Bootstrap.LoadConfiguration).bootstrap();

	await sandbox.app.resolve(Validation).register();
	await sandbox.app.resolve(CryptoConfig).register();
	await sandbox.app.resolve(CryptoValidation).register();
	await sandbox.app.resolve(CryptoHashBcrypto).register();
	await sandbox.app.resolve(CryptoSignatureSchnorr).register();
	await sandbox.app.resolve(CryptoKeyPairSchnorr).register();
	await sandbox.app.resolve(CryptoConsensusBls).register();
	await sandbox.app.resolve(CryptoAddressBeach32m).register();
	await sandbox.app.resolve(CryptoWif).register();
	await sandbox.app.resolve(Serializer).register();
	await sandbox.app.resolve(CryptoBlock).register();
	await sandbox.app.resolve(State).register();
	await sandbox.app.resolve(Database).register();
	await sandbox.app.resolve(Transactions).register();
	await sandbox.app.resolve(TransactionPool).register();
	await sandbox.app.resolve(CryptoMessages).register();
	await sandbox.app.resolve(CryptoCommit).register();
	await sandbox.app.resolve(CryptoCommit).register();
	await sandbox.app.resolve(Processor).register();
	await sandbox.app.resolve(Validator).register();
	await sandbox.app.resolve(Proposer).register();
	await sandbox.app.resolve(Consensus).register();

	return sandbox;
};
