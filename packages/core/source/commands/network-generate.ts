import { Commands, Container } from "@arkecosystem/core-cli";
// import { Commands, Container, Contracts, Services } from "@arkecosystem/core-cli";
// import Interfaces from "@arkecosystem/core-crypto-contracts";
// import { BigNumber } from "@arkecosystem/utils";
// import { generateMnemonic } from "bip39";
// import envPaths from "env-paths";
// import { ensureDirSync, existsSync, readJSONSync, writeFileSync, writeJSONSync } from "fs-extra";
import Joi from "joi";
// import { join, resolve } from "path";
// import prompts from "prompts";

// interface Wallet {
// 	address: string;
// 	passphrase: string;
// 	keys: Interfaces.IKeyPair;
// 	username: string | undefined;
// }

interface Flag {
	name: string;
	description: string;
	schema: Joi.Schema;
	promptType?: string;
	default?: any;
}

// interface DynamicFees {
// 	enabled?: boolean;
// 	minFeePool?: number;
// 	minFeeBroadcast?: number;
// 	addonBytes: {
// 		transfer?: number;
// 		delegateRegistration?: number;
// 		vote?: number;
// 		multiSignature?: number;
// 		multiPayment?: number;
// 		delegateResignation?: number;
// 	};
// }

// interface Options {
// 	network: string;
// 	premine: string;
// 	delegates: number;
// 	blocktime: number;
// 	maxTxPerBlock: number;
// 	maxBlockPayload: number;
// 	rewardHeight: number;
// 	rewardAmount: string | number;
// 	pubKeyHash: number;
// 	wif: number;
// 	token: string;
// 	symbol: string;
// 	explorer: string;
// 	distribute: boolean;
// 	epoch: Date;
// 	vendorFieldLength: number;

// 	// Static Fee
// 	feeStaticTransfer: number;
// 	feeStaticDelegateRegistration: number;
// 	feeStaticVote: number;
// 	feeStaticMultiSignature: number;
// 	feeStaticMultiPayment: number;
// 	feeStaticDelegateResignation: number;

// 	// Dynamic Fee
// 	feeDynamicEnabled?: boolean;
// 	feeDynamicMinFeePool?: number;
// 	feeDynamicMinFeeBroadcast?: number;
// 	feeDynamicBytesTransfer?: number;
// 	feeDynamicBytesDelegateRegistration?: number;
// 	feeDynamicBytesVote?: number;
// 	feeDynamicBytesMultiSignature?: number;
// 	feeDynamicBytesMultiPayment?: number;
// 	feeDynamicBytesDelegateResignation?: number;

// 	// Env
// 	coreDBHost: string;
// 	coreDBPort: number;
// 	coreDBUsername?: string;
// 	coreDBPassword?: string;
// 	coreDBDatabase?: string;

// 	coreP2PPort: number;
// 	coreAPIPort: number;
// 	coreWebhooksPort: number;
// 	coreMonitorPort: number;

// 	// Peers
// 	peers: string;

// 	// General
// 	configPath?: string;
// 	overwriteConfig: boolean;
// 	force: boolean;
// }

@Container.injectable()
export class Command extends Commands.Command {
	// @Container.inject(Container.Identifiers.Logger)
	// private readonly logger!: Services.Logger;

	public signature = "network:generate";

	public description = "Generates a new network configuration.";

	public requiresNetwork = false;

	/*eslint-disable */
	private flagSettings: Flag[] = [
		{ name: "network", description: "The name of the network.", schema: Joi.string(), promptType: "text" },
		{
			name: "premine",
			description: "The number of pre-mined tokens.",
			schema: Joi.alternatives().try(Joi.string(), Joi.number()),
			promptType: "text",
			default: "12500000000000000",
		},
		{
			name: "delegates",
			description: "The number of delegates to generate.",
			schema: Joi.number(),
			promptType: "number",
			default: 51,
		},
		{
			name: "blocktime",
			description: "The network blocktime.",
			schema: Joi.number(),
			promptType: "number",
			default: 8,
		},
		{
			name: "maxTxPerBlock",
			description: "The maximum number of transactions per block.",
			schema: Joi.number(),
			promptType: "number",
			default: 150,
		},
		{
			name: "maxBlockPayload",
			description: "The maximum payload length by block.",
			schema: Joi.number(),
			promptType: "number",
			default: 2097152,
		},
		{
			name: "rewardHeight",
			description: "The height at which delegate block reward starts.",
			schema: Joi.number(),
			promptType: "number",
			default: 75600,
		},
		{
			name: "rewardAmount",
			description: "The number of the block reward per forged block.",
			schema: Joi.alternatives().try(Joi.string(), Joi.number()),
			promptType: "number",
			default: "200000000",
		},
		{
			name: "pubKeyHash",
			description: "The public key hash.",
			schema: Joi.number(),
			promptType: "number",
			default: 30,
		},
		{
			name: "wif",
			description: "The WIF (Wallet Import Format) that should be used.",
			schema: Joi.number(),
			promptType: "number",
		},
		{
			name: "token",
			description: "The name that is attributed to the token on the network.",
			schema: Joi.string(),
			promptType: "text",
		},
		{
			name: "symbol",
			description: "The character that is attributed to the token on the network.",
			schema: Joi.string(),
			promptType: "text",
		},
		{
			name: "explorer",
			description: "The URL that hosts the network explorer.",
			schema: Joi.string(),
			promptType: "text",
		},
		{
			name: "distribute",
			description: "Distribute the premine evenly between all delegates?",
			schema: Joi.bool(),
			promptType: "confirm",
			default: false,
		},

		{
			name: "epoch",
			description: "Start time of the network.",
			schema: Joi.date(),
			default: new Date(Date.now()).toISOString().slice(0, 11) + "00:00:00.000Z",
		},
		{
			name: "vendorFieldLength",
			description: "The maximum length of transaction's vendor field",
			schema: Joi.number().min(0).max(255),
			default: 255,
		},

		// Static fee
		{
			name: "feeStaticTransfer",
			description: "Fee for transfer transactions.",
			schema: Joi.number(),
			default: 10000000,
		},
		{
			name: "feeStaticDelegateRegistration",
			description: "Fee for delegate registration transactions.",
			schema: Joi.number(),
			default: 2500000000,
		},
		{ name: "feeStaticVote", description: "Fee for vote transactions.", schema: Joi.number(), default: 100000000 },
		{
			name: "feeStaticMultiSignature",
			description: "Fee for multi signature transactions.",
			schema: Joi.number(),
			default: 500000000,
		},
		{
			name: "feeStaticMultiPayment",
			description: "Fee for multi payment transactions.",
			schema: Joi.number(),
			default: 10000000,
		},
		{
			name: "feeStaticDelegateResignation",
			description: "Fee for delegate resignation transactions.",
			schema: Joi.number(),
			default: 2500000000,
		},

		// Dynamic fee
		{ name: "feeDynamicEnabled", description: "Dynamic fee enabled", schema: Joi.boolean() },
		{ name: "feeDynamicMinFeePool", description: "Minimum dynamic fee to enter the pool.", schema: Joi.number() },
		{ name: "feeDynamicMinFeeBroadcast", description: "Minimum dynamic fee to broadcast.", schema: Joi.number() },
		{
			name: "feeDynamicBytesTransfer",
			description: "Dynamic fee for transfer transactions.",
			schema: Joi.number(),
		},
		{
			name: "feeDynamicBytesDelegateRegistration",
			description: "Dynamic fee for delegate registration transactions.",
			schema: Joi.number(),
		},
		{ name: "feeDynamicBytesVote", description: "Dynamic fee for vote transactions.", schema: Joi.number() },
		{
			name: "feeDynamicBytesMultiSignature",
			description: "Dynamic fee for multi signature transactions.",
			schema: Joi.number(),
		},
		{
			name: "feeDynamicBytesMultiPayment",
			description: "Dynamic fee for multi payment transactions.",
			schema: Joi.number(),
		},
		{
			name: "feeDynamicBytesDelegateResignation",
			description: "Dynamic fee for delegate registration transactions.",
			schema: Joi.number(),
		},

		// Env
		{ name: "coreDBHost", description: "Core database host.", schema: Joi.string(), default: "localhost" },
		{ name: "coreDBPort", description: "Core database port.", schema: Joi.number(), default: 5432 },
		{ name: "coreDBUsername", description: "Core database username.", schema: Joi.string() },
		{ name: "coreDBPassword", description: "Core database password.", schema: Joi.string() },
		{ name: "coreDBDatabase", description: "Core database database.", schema: Joi.string() },

		{ name: "coreP2PPort", description: "Core P2P port.", schema: Joi.number(), default: 4000 },
		{ name: "coreAPIPort", description: "Core API port.", schema: Joi.number(), default: 4003 },
		{ name: "coreWebhooksPort", description: "Core Webhooks port.", schema: Joi.number(), default: 4004 },
		{ name: "coreMonitorPort", description: "Core Webhooks port.", schema: Joi.number(), default: 4005 },

		// Peers
		{
			name: "peers",
			description: "Peers IP addresses (and ports), separated with comma.",
			schema: Joi.string().allow(""),
			default: "127.0.0.1",
		},

		// General
		{ name: "configPath", description: "Configuration path.", schema: Joi.string() },
		{
			name: "overwriteConfig",
			description: "Overwrite existing configuration.",
			schema: Joi.boolean(),
			default: false,
		},
		{ name: "force", description: "Skip prompts and use given flags.", schema: Joi.boolean(), default: false },
	];
	/*eslint-enable */

	public configure(): void {
		for (const flag of this.flagSettings) {
			const flagSchema: Joi.Schema = flag.schema;

			if (flag.default !== undefined) {
				flagSchema.default(flag.default);

				flag.description += ` (${flag.default.toString()})`;
			}

			this.definition.setFlag(flag.name, flag.description, flag.schema);
		}
	}

	public async execute(): Promise<void> {
		// const flags: Contracts.AnyObject = this.getFlags();
		// const allFlagsSet = !this.flagSettings
		// 	.filter((flag) => flag.promptType)
		// 	.find((flag) => flags[flag.name] === undefined);
		// const defaults = this.flagSettings.reduce<any>((accumulator: any, flag: Flag) => {
		// 	accumulator[flag.name] = flag.default;
		// 	return accumulator;
		// }, {});
		// let options = {
		// 	...defaults,
		// 	...flags,
		// };
		// if (flags.force || allFlagsSet) {
		// 	return this.generateNetwork(options as Options);
		// }
		// const response = await prompts(
		// 	this.flagSettings
		// 		.filter((flag) => flag.promptType) // Show prompt only for flags with defined promptType
		// 		.map(
		// 			(flag) =>
		// 				({
		// 					initial: flags[flag.name] ? `${flags[flag.name]}` : flag.default || "undefined",
		// 					message: flag.description,
		// 					name: flag.name,
		// 					type: flag.promptType,
		// 				} as prompts.PromptObject<string>),
		// 		)
		// 		.concat({
		// 			message: "Can you confirm?",
		// 			name: "confirm",
		// 			type: "confirm",
		// 		} as prompts.PromptObject<string>),
		// );
		// options = {
		// 	...defaults,
		// 	...flags,
		// 	...response,
		// };
		// if (!response.confirm) {
		// 	throw new Error("You'll need to confirm the input to continue.");
		// }
		// for (const flag of this.flagSettings.filter((flag) => flag.promptType)) {
		// 	if (flag.promptType === "text" && options[flag.name] !== "undefined") {
		// 		continue;
		// 	}
		// 	if (flag.promptType === "number" && !Number.isNaN(options[flag.name])) {
		// 		continue;
		// 	}
		// 	if (["confirm", "date"].includes(flag.promptType)) {
		// 		continue;
		// 	}
		// 	throw new Error(`Flag ${flag.name} is required.`);
		// }
		// await this.generateNetwork(options);
	}

	// private async generateNetwork(flags: Options): Promise<void> {
	// 	const paths = envPaths(flags.token, { suffix: "core" });
	// 	const configPath = flags.configPath ? flags.configPath : paths.config;

	// 	const coreConfigDestination = join(configPath, flags.network);
	// 	const cryptoConfigDestination = join(coreConfigDestination, "crypto");

	// 	const delegates: any[] = this.generateCoreDelegates(flags.delegates, flags.pubKeyHash);

	// 	const genesisWallet = this.createWallet(flags.pubKeyHash);

	// 	await this.components.taskList([
	// 		{
	// 			task: async () => {
	// 				if (!flags.overwriteConfig) {
	// 					if (existsSync(coreConfigDestination)) {
	// 						throw new Error(`${coreConfigDestination} already exists.`);
	// 					}

	// 					if (existsSync(cryptoConfigDestination)) {
	// 						throw new Error(`${cryptoConfigDestination} already exists.`);
	// 					}
	// 				}

	// 				ensureDirSync(coreConfigDestination);
	// 				ensureDirSync(cryptoConfigDestination);
	// 			},
	// 			title: `Prepare directories.`,
	// 		},
	// 		{
	// 			task: async () => {
	// 				writeJSONSync(resolve(coreConfigDestination, "genesis-wallet.json"), genesisWallet, { spaces: 4 });
	// 			},
	// 			title: "Persist genesis wallet to genesis-wallet.json in core config path.",
	// 		},
	// 		{
	// 			task: async () => {
	// 				const genesisBlock = this.generateCryptoGenesisBlock(genesisWallet, delegates, flags);

	// 				writeJSONSync(
	// 					resolve(cryptoConfigDestination, "network.json"),
	// 					this.generateCryptoNetwork(genesisBlock.payloadHash, flags),
	// 					{ spaces: 4 },
	// 				);

	// 				writeJSONSync(
	// 					resolve(cryptoConfigDestination, "milestones.json"),
	// 					this.generateCryptoMilestones(flags),
	// 					{
	// 						spaces: 4,
	// 					},
	// 				);

	// 				writeJSONSync(resolve(cryptoConfigDestination, "genesisBlock.json"), genesisBlock, { spaces: 4 });

	// 				writeJSONSync(resolve(cryptoConfigDestination, "exceptions.json"), {});

	// 				writeFileSync(
	// 					resolve(cryptoConfigDestination, "index.ts"),
	// 					[
	// 						'import exceptions from "./exceptions.json";',
	// 						'import genesisBlock from "./genesisBlock.json";',
	// 						'import milestones from "./milestones.json";',
	// 						'import network from "./network.json";',
	// 						"",
	// 						`export const ${flags.network} = { exceptions, genesisBlock, milestones, network };`,
	// 						"",
	// 					].join("\n"),
	// 				);
	// 			},
	// 			title: "Generate crypto network configuration.",
	// 		},
	// 		{
	// 			task: async () => {
	// 				writeJSONSync(resolve(coreConfigDestination, "peers.json"), this.generatePeers(flags), {
	// 					spaces: 4,
	// 				});

	// 				writeJSONSync(
	// 					resolve(coreConfigDestination, "delegates.json"),
	// 					{ secrets: delegates.map((d) => d.passphrase) },
	// 					{ spaces: 4 },
	// 				);

	// 				writeFileSync(resolve(coreConfigDestination, ".env"), this.generateEnvironmentVariables(flags));

	// 				writeJSONSync(resolve(coreConfigDestination, "app.json"), this.generateApp(flags), { spaces: 4 });
	// 			},
	// 			title: "Generate Core network configuration.",
	// 		},
	// 	]);

	// 	this.logger.info(`Configuration generated on location: ${coreConfigDestination}`);
	// }

	// private generateCryptoNetwork(nethash: string, options: Options) {
	// 	return {
	// 		aip20: 0,
	// 		bip32: {
	// 			private: 70_615_956,
	// 			public: 70_617_039,
	// 		},
	// 		client: {
	// 			explorer: options.explorer,
	// 			symbol: options.symbol,
	// 			token: options.token,
	// 		},
	// 		messagePrefix: `${options.network} message:\n`,
	// 		name: options.network,
	// 		nethash,
	// 		pubKeyHash: options.pubKeyHash,
	// 		slip44: 1,
	// 		wif: options.wif,
	// 	};
	// }

	// private generateCryptoMilestones(options: Options) {
	// 	const epoch = new Date(options.epoch);

	// 	return [
	// 		{
	// 			activeDelegates: options.delegates,
	// 			block: {
	// 				maxPayload: options.maxBlockPayload,
	// 				maxTransactions: options.maxTxPerBlock,
	// 				version: 0,
	// 			},
	// 			blocktime: options.blocktime,
	// 			epoch: epoch.toISOString(),
	// 			fees: {
	// 				staticFees: {
	// 					delegateRegistration: options.feeStaticDelegateRegistration,
	// 					delegateResignation: options.feeStaticDelegateResignation,
	// 					multiPayment: options.feeStaticMultiPayment,
	// 					multiSignature: options.feeStaticMultiSignature,
	// 					transfer: options.feeStaticTransfer,
	// 					vote: options.feeStaticVote,
	// 				},
	// 			},
	// 			height: 1,
	// 			multiPaymentLimit: 256,
	// 			reward: "0",
	// 			vendorFieldLength: options.vendorFieldLength,
	// 		},
	// 		{
	// 			height: options.rewardHeight,
	// 			reward: options.rewardAmount,
	// 		},
	// 	];
	// }

	// private generateCryptoGenesisBlock(genesisWallet, delegates, options: Options) {
	// 	// this.configuration.set("network.pubKeyHash", options.pubKeyHash);

	// 	const premineWallet: Wallet = this.createWallet(options.pubKeyHash);

	// 	let transactions = [];

	// 	if (options.distribute) {
	// 		transactions = transactions.concat(
	// 			...this.createTransferTransactions(premineWallet, delegates, options.premine, options.pubKeyHash),
	// 		);
	// 	} else {
	// 		transactions = transactions.concat(
	// 			this.createTransferTransaction(premineWallet, genesisWallet, options.premine, options.pubKeyHash),
	// 		);
	// 	}

	// 	transactions = transactions.concat(
	// 		...this.buildDelegateTransactions(delegates, options.pubKeyHash),
	// 		...this.buildVoteTransactions(delegates, options.pubKeyHash),
	// 	);

	// 	return this.createGenesisBlock(premineWallet.keys, transactions, 0);
	// }

	// private generateEnvironmentVariables(options: Options): string {
	// 	let result = "";

	// 	result += "CORE_LOG_LEVEL=info\n";
	// 	result += "CORE_LOG_LEVEL_FILE=info\n\n";

	// 	result += `CORE_DB_HOST=${options.coreDBHost}\n`;
	// 	result += `CORE_DB_PORT=${options.coreDBPort}\n`;
	// 	result += options.coreDBUsername ? `CORE_DB_USERNAME=${options.coreDBUsername}\n` : "";
	// 	result += options.coreDBPassword ? `CORE_DB_PASSWORD=${options.coreDBPassword}\n` : "";
	// 	result += options.coreDBDatabase ? `CORE_DB_DATABASE=${options.coreDBDatabase}\n\n` : "\n";

	// 	result += "CORE_P2P_HOST=0.0.0.0\n";
	// 	result += `CORE_P2P_PORT=${options.coreP2PPort}\n\n`;

	// 	result += "CORE_API_HOST=0.0.0.0\n";
	// 	result += `CORE_API_PORT=${options.coreAPIPort}\n\n`;

	// 	result += "CORE_WEBHOOKS_HOST=0.0.0.0\n";
	// 	result += `CORE_WEBHOOKS_PORT=${options.coreWebhooksPort}\n\n`;

	// 	result += "CORE_MANAGER_HOST=0.0.0.0\n";
	// 	result += `CORE_MANAGER_PORT=${options.coreMonitorPort}\n\n`;

	// 	return result;
	// }

	// private generatePeers(options: Options): { list: { ip: string; port: number }[] } {
	// 	if (options.peers === "") {
	// 		return { list: [] };
	// 	}

	// 	const list = options.peers
	// 		.replace(" ", "")
	// 		.split(",")
	// 		.map((peer) => {
	// 			const [ip, port] = peer.split(":");

	// 			return {
	// 				ip,
	// 				port: Number.isNaN(Number.parseInt(port)) ? options.coreP2PPort : Number.parseInt(port),
	// 			};
	// 		});

	// 	return { list };
	// }

	// private generateApp(options: Options): any {
	// 	const dynamicFees: DynamicFees = {
	// 		addonBytes: {},
	// 		enabled: undefined,
	// 		minFeeBroadcast: undefined,
	// 		minFeePool: undefined,
	// 	};

	// 	let includeDynamicFees = false;

	// 	if (options.feeDynamicEnabled) {
	// 		dynamicFees.enabled = options.feeDynamicEnabled;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicMinFeePool) {
	// 		dynamicFees.minFeePool = options.feeDynamicMinFeePool;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicMinFeeBroadcast) {
	// 		dynamicFees.minFeeBroadcast = options.feeDynamicMinFeeBroadcast;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicBytesTransfer) {
	// 		dynamicFees.addonBytes.transfer = options.feeDynamicBytesTransfer;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicBytesDelegateRegistration) {
	// 		dynamicFees.addonBytes.delegateRegistration = options.feeDynamicBytesDelegateRegistration;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicBytesVote) {
	// 		dynamicFees.addonBytes.vote = options.feeDynamicBytesVote;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicBytesMultiSignature) {
	// 		dynamicFees.addonBytes.multiSignature = options.feeDynamicBytesMultiSignature;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicBytesMultiPayment) {
	// 		dynamicFees.addonBytes.multiPayment = options.feeDynamicBytesMultiPayment;
	// 		includeDynamicFees = true;
	// 	}
	// 	if (options.feeDynamicBytesDelegateResignation) {
	// 		dynamicFees.addonBytes.delegateResignation = options.feeDynamicBytesDelegateResignation;
	// 		includeDynamicFees = true;
	// 	}

	// 	if (Object.keys(dynamicFees.addonBytes).length === 0) {
	// 		// @ts-ignore
	// 		delete dynamicFees.addonBytes;
	// 	}

	// 	const app = readJSONSync(resolve(__dirname, "../../bin/config/testnet/app.json"));

	// 	if (includeDynamicFees) {
	// 		app.core.plugins.find((plugin) => plugin.package === "@arkecosystem/core-transaction-pool").options = {
	// 			dynamicFees,
	// 		};

	// 		app.relay.plugins.find((plugin) => plugin.package === "@arkecosystem/core-transaction-pool").options = {
	// 			dynamicFees,
	// 		};
	// 	}

	// 	return app;
	// }

	// private generateCoreDelegates(activeDelegates: number, pubKeyHash: number): Wallet[] {
	// 	const wallets: Wallet[] = [];
	// 	for (let index = 0; index < activeDelegates; index++) {
	// 		const delegateWallet: Wallet = this.createWallet(pubKeyHash);
	// 		delegateWallet.username = `genesis_${index + 1}`;

	// 		wallets.push(delegateWallet);
	// 	}

	// 	return wallets;
	// }

	// private createWallet(pubKeyHash: number): Wallet {
	// 	const passphrase = generateMnemonic();

	// 	const keys: Interfaces.IKeyPair = Identities.Keys.fromMnemonic(passphrase);

	// 	return {
	// 		address: this.addressFactory.fromPublicKey(keys.publicKey, pubKeyHash),
	// 		keys,
	// 		passphrase,
	// 		username: undefined,
	// 	};
	// }

	// private createTransferTransaction(
	// 	sender: Wallet,
	// 	recipient: Wallet,
	// 	amount: string,
	// 	pubKeyHash: number,
	// 	nonce = 1,
	// ): any {
	// 	return this.formatGenesisTransaction(
	// 		Transactions.BuilderFactory.transfer()
	// 			.network(pubKeyHash)
	// 			.version(2)
	// 			.nonce(nonce.toFixed(0))
	// 			.recipientId(recipient.address)
	// 			.amount(amount)
	// 			.sign(sender.passphrase).data,
	// 		sender,
	// 	);
	// }

	// private createTransferTransactions(
	// 	sender: Wallet,
	// 	recipients: Wallet[],
	// 	totalPremine: string,
	// 	pubKeyHash: number,
	// ): any {
	// 	const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

	// 	return recipients.map((recipientWallet: Wallet, index: number) =>
	// 		this.createTransferTransaction(sender, recipientWallet, amount, pubKeyHash, index + 1),
	// 	);
	// }

	// private buildDelegateTransactions(senders: Wallet[], pubKeyHash: number) {
	// 	return senders.map((sender: Wallet) =>
	// 		this.formatGenesisTransaction(
	// 			Transactions.BuilderFactory.delegateRegistration()
	// 				.network(pubKeyHash)
	// 				.version(2)
	// 				.nonce("1") // delegate registration tx is always the first one from sender
	// 				.usernameAsset(sender.username)
	// 				.fee(`${25 * 1e8}`)
	// 				.sign(sender.passphrase).data,
	// 			sender,
	// 		),
	// 	);
	// }

	// private buildVoteTransactions(senders: Wallet[], pubKeyHash: number) {
	// 	return senders.map((sender: Wallet) =>
	// 		this.formatGenesisTransaction(
	// 			Transactions.BuilderFactory.vote()
	// 				.network(pubKeyHash)
	// 				.version(2)
	// 				.nonce("2") // vote transaction is always the 2nd tx from sender (1st one is delegate registration)
	// 				.votesAsset([`+${sender.keys.publicKey}`])
	// 				.fee(`${1 * 1e8}`)
	// 				.sign(sender.passphrase).data,
	// 			sender,
	// 		),
	// 	);
	// }

	// private formatGenesisTransaction(transaction, wallet: Wallet) {
	// 	Object.assign(transaction, {
	// 		fee: BigNumber.ZERO,
	// 		timestamp: 0,
	// 	});
	// 	transaction.signature = Transactions.Signer.sign(transaction, wallet.keys);
	// 	transaction.id = Transactions.Utils.getId(transaction);

	// 	return transaction;
	// }

	// private createGenesisBlock(keys: Interfaces.IKeyPair, transactions, timestamp: number) {
	// 	transactions = transactions.sort((a, b) => {
	// 		if (a.type === b.type) {
	// 			return a.amount - b.amount;
	// 		}

	// 		return a.type - b.type;
	// 	});

	// 	let payloadLength = 0;
	// 	let totalFee: BigNumber = BigNumber.ZERO;
	// 	let totalAmount: BigNumber = BigNumber.ZERO;
	// 	const allBytes: Buffer[] = [];

	// 	for (const transaction of transactions) {
	// 		const bytes: Buffer = Transactions.Serializer.getBytes(transaction);

	// 		allBytes.push(bytes);

	// 		payloadLength += bytes.length;
	// 		totalFee = totalFee.plus(transaction.fee);
	// 		totalAmount = totalAmount.plus(BigNumber.make(transaction.amount));
	// 	}

	// 	const payloadHash: Buffer = Crypto.HashAlgorithms.sha256(Buffer.concat(allBytes));

	// 	const block: any = {
	// 		blockSignature: undefined,

	// 		// @ts-ignore
	// 		generatorPublicKey: keys.publicKey.toString("hex"),

	// 		height: 1,

	// 		id: undefined,

	// 		numberOfTransactions: transactions.length,

	// 		payloadHash: payloadHash.toString("hex"),

	// 		payloadLength,

	// 		previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",

	// 		reward: "0",

	// 		timestamp,
	// 		totalAmount: totalAmount.toString(),
	// 		totalFee: totalFee.toString(),
	// 		transactions,
	// 		version: 0,
	// 	};

	// 	block.id = Blocks.Block.getId(block);

	// 	block.blockSignature = this.signBlock(block, keys);

	// 	return block;
	// }

	// private signBlock(block, keys: Interfaces.IKeyPair): string {
	// 	return Crypto.Hash.signECDSA(this.getHash(block), keys);
	// }

	// private getHash(block): Buffer {
	// 	return Crypto.HashAlgorithms.sha256(Blocks.Serializer.serialize(block, false));
	// }
}
