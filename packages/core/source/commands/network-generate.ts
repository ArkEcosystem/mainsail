import { join, resolve } from "path";
import { Commands, Container, Contracts, Services } from "@arkecosystem/core-cli";
import { ServiceProvider as CoreCryptoAddressBech32m } from "@arkecosystem/core-crypto-address-bech32m";
import { ServiceProvider as CoreCryptoBlock } from "@arkecosystem/core-crypto-block";
import { ServiceProvider as CoreCryptoConfig } from "@arkecosystem/core-crypto-config";
import Interfaces, {
	BINDINGS,
	IAddressFactory,
	IBlockSerializer,
	IConfiguration,
	IHashFactory,
	IKeyPairFactory,
	ITransactionSerializer,
	ITransactionSigner,
	ITransactionUtils,
	Signatory,
} from "@arkecosystem/core-crypto-contracts";
import { ServiceProvider as CoreCryptoHashBcrypto } from "@arkecosystem/core-crypto-hash-bcrypto";
import { ServiceProvider as CoreCryptoKeyPairSchnorr } from "@arkecosystem/core-crypto-key-pair-schnorr";
import { ServiceProvider as CoreCryptoSignatureSchnorr } from "@arkecosystem/core-crypto-signature-schnorr";
import { ServiceProvider as CoreCryptoTime } from "@arkecosystem/core-crypto-time";
import { ServiceProvider as CoreCryptoTransaction } from "@arkecosystem/core-crypto-transaction";
import {
	DelegateRegistrationBuilder,
	ServiceProvider as CoreCryptoTransactionDelegateRegistration,
} from "@arkecosystem/core-crypto-transaction-delegate-registration";
import { ServiceProvider as CoreCryptoTransactionDelegateResignation } from "@arkecosystem/core-crypto-transaction-delegate-resignation";
import { ServiceProvider as CoreCryptoTransactionMultiPayment } from "@arkecosystem/core-crypto-transaction-multi-payment";
import { ServiceProvider as CoreCryptoTransactionMultiSignatureRegistration } from "@arkecosystem/core-crypto-transaction-multi-signature-registration";
import {
	ServiceProvider as CoreCryptoTransactionTransfer,
	TransferBuilder,
} from "@arkecosystem/core-crypto-transaction-transfer";
import { ServiceProvider as CoreCryptoTransactionVote, VoteBuilder } from "@arkecosystem/core-crypto-transaction-vote";
import { ServiceProvider as CoreCryptoValidation } from "@arkecosystem/core-crypto-validation";
import { ServiceProvider as CoreCryptoWif } from "@arkecosystem/core-crypto-wif";
import { ServiceProvider as CoreFees } from "@arkecosystem/core-fees";
import { ServiceProvider as CoreFeesStatic } from "@arkecosystem/core-fees-static";
import { ServiceProvider as CoreValidation } from "@arkecosystem/core-validation";
import { BigNumber } from "@arkecosystem/utils";
import { generateMnemonic } from "bip39";
import envPaths from "env-paths";
import { ensureDirSync, existsSync, readJSONSync, writeFileSync, writeJSONSync } from "fs-extra";
import Joi from "joi";
import prompts from "prompts";

interface Wallet {
	address: string;
	passphrase: string;
	keys: Interfaces.IKeyPair;
	username: string | undefined;
}

interface Flag {
	name: string;
	description: string;
	schema: Joi.Schema;
	promptType?: string;
	default?: any;
}

interface DynamicFees {
	enabled?: boolean;
	minFeePool?: number;
	minFeeBroadcast?: number;
	addonBytes: {
		transfer?: number;
		delegateRegistration?: number;
		vote?: number;
		multiSignature?: number;
		multiPayment?: number;
		delegateResignation?: number;
	};
}

interface Options {
	network: string;
	premine: string;
	delegates: number;
	blocktime: number;
	maxTxPerBlock: number;
	maxBlockPayload: number;
	rewardHeight: number;
	rewardAmount: string | number;
	pubKeyHash: number;
	wif: number;
	token: string;
	symbol: string;
	explorer: string;
	distribute: boolean;
	epoch: Date;
	vendorFieldLength: number;

	// Env
	coreDBHost: string;
	coreDBPort: number;
	coreDBUsername?: string;
	coreDBPassword?: string;
	coreDBDatabase?: string;

	coreP2PPort: number;
	coreAPIPort: number;
	coreWebhooksPort: number;
	coreMonitorPort: number;

	// Peers
	peers: string;

	// General
	configPath?: string;
	overwriteConfig: boolean;
	force: boolean;
}

@Container.injectable()
export class Command extends Commands.Command {
	@Container.inject(Container.Identifiers.Logger)
	private readonly logger!: Services.Logger;

	public signature = "network:generate";

	public description = "Generates a new network configuration.";

	public requiresNetwork = false;

	/*eslint-disable */
	private flagSettings: Flag[] = [
		{
			name: "network",
			description: "The name of the network.",
			schema: Joi.string(),
			promptType: "text",
			default: "testnet",
		},
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
			default: 186,
		},
		{
			name: "token",
			description: "The name that is attributed to the token on the network.",
			schema: Joi.string(),
			promptType: "text",
			default: "ARK",
		},
		{
			name: "symbol",
			description: "The character that is attributed to the token on the network.",
			schema: Joi.string(),
			promptType: "text",
			default: "TѦ",
		},
		{
			name: "explorer",
			description: "The URL that hosts the network explorer.",
			schema: Joi.string(),
			promptType: "text",
			default: "https://explorer.ark.io",
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

	public async initialize(): Promise<void> {
		await this.app.resolve<CoreValidation>(CoreValidation).register();
		await this.app.resolve<CoreCryptoConfig>(CoreCryptoConfig).register();
		await this.app.resolve<CoreCryptoTime>(CoreCryptoTime).register();
		await this.app.resolve<CoreCryptoValidation>(CoreCryptoValidation).register();
		await this.app.resolve<CoreCryptoHashBcrypto>(CoreCryptoHashBcrypto).register();
		await this.app.resolve<CoreCryptoSignatureSchnorr>(CoreCryptoSignatureSchnorr).register();
		await this.app.resolve<CoreCryptoKeyPairSchnorr>(CoreCryptoKeyPairSchnorr).register();
		await this.app.resolve<CoreCryptoAddressBech32m>(CoreCryptoAddressBech32m).register();
		await this.app.resolve<CoreCryptoWif>(CoreCryptoWif).register();
		await this.app.resolve<CoreCryptoBlock>(CoreCryptoBlock).register();
		await this.app.resolve<CoreFees>(CoreFees).register();
		await this.app.resolve<CoreFeesStatic>(CoreFeesStatic).register();
		await this.app.resolve<CoreCryptoTransaction>(CoreCryptoTransaction).register();
		await this.app
			.resolve<CoreCryptoTransactionDelegateRegistration>(CoreCryptoTransactionDelegateRegistration)
			.register();
		await this.app
			.resolve<CoreCryptoTransactionDelegateResignation>(CoreCryptoTransactionDelegateResignation)
			.register();
		await this.app.resolve<CoreCryptoTransactionMultiPayment>(CoreCryptoTransactionMultiPayment).register();
		await this.app
			.resolve<CoreCryptoTransactionMultiSignatureRegistration>(CoreCryptoTransactionMultiSignatureRegistration)
			.register();
		await this.app.resolve<CoreCryptoTransactionTransfer>(CoreCryptoTransactionTransfer).register();
		await this.app.resolve<CoreCryptoTransactionVote>(CoreCryptoTransactionVote).register();
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = this.getFlags();

		const allFlagsSet = !this.flagSettings
			.filter((flag) => flag.promptType)
			.find((flag) => flags[flag.name] === undefined);

		const defaults = this.flagSettings.reduce<any>((accumulator: any, flag: Flag) => {
			accumulator[flag.name] = flag.default;

			return accumulator;
		}, {});

		let options = {
			...defaults,
			...flags,
		};

		if (flags.force || allFlagsSet) {
			return this.generateNetwork(options as Options);
		}

		const response = await prompts(
			this.flagSettings
				.filter((flag) => flag.promptType) // Show prompt only for flags with defined promptType
				.map(
					(flag) =>
						({
							initial: flags[flag.name] ? `${flags[flag.name]}` : flag.default || "undefined",
							message: flag.description,
							name: flag.name,
							type: flag.promptType,
						} as prompts.PromptObject<string>),
				)
				.concat({
					message: "Can you confirm?",
					name: "confirm",
					type: "confirm",
				} as prompts.PromptObject<string>),
		);

		options = {
			...defaults,
			...flags,
			...response,
		};

		if (!response.confirm) {
			throw new Error("You'll need to confirm the input to continue.");
		}

		for (const flag of this.flagSettings.filter((flag) => flag.promptType)) {
			if (flag.promptType === "text" && options[flag.name] !== "undefined") {
				continue;
			}

			if (flag.promptType === "number" && !Number.isNaN(options[flag.name])) {
				continue;
			}

			if (["confirm", "date"].includes(flag.promptType)) {
				continue;
			}

			throw new Error(`Flag ${flag.name} is required.`);
		}

		await this.generateNetwork(options);
	}

	private async generateNetwork(flags: Options): Promise<void> {
		try {
			// @TODO
			this.app.get<IConfiguration>(BINDINGS.Configuration).set("network.address.base58", flags.pubKeyHash);
			// @TODO
			this.app.get<IConfiguration>(BINDINGS.Configuration).set("network.address.bech32m", "ark");

			const paths = envPaths(flags.token, { suffix: "core" });
			const configPath = flags.configPath ? flags.configPath : paths.config;

			const coreConfigDestination = join(configPath, flags.network);
			const cryptoConfigDestination = join(coreConfigDestination, "crypto");

			const delegates: any[] = await this.generateCoreDelegates(flags.delegates, flags.pubKeyHash);

			const genesisWallet = await this.createWallet(flags.pubKeyHash);

			await this.components.taskList([
				{
					task: async () => {
						if (!flags.overwriteConfig) {
							if (existsSync(coreConfigDestination)) {
								throw new Error(`${coreConfigDestination} already exists.`);
							}

							if (existsSync(cryptoConfigDestination)) {
								throw new Error(`${cryptoConfigDestination} already exists.`);
							}
						}

						ensureDirSync(coreConfigDestination);
						ensureDirSync(cryptoConfigDestination);
					},
					title: `Prepare directories.`,
				},
				{
					task: async () => {
						writeJSONSync(resolve(coreConfigDestination, "genesis-wallet.json"), genesisWallet, {
							spaces: 4,
						});
					},
					title: "Persist genesis wallet to genesis-wallet.json in core config path.",
				},
				{
					task: async () => {
						// Milestones
						const milestones = this.generateCryptoMilestones(flags);

						writeJSONSync(resolve(cryptoConfigDestination, "milestones.json"), milestones, {
							spaces: 4,
						});

						this.app.get<IConfiguration>(BINDINGS.Configuration).setConfig({
							// @ts-ignore
							genesisBlock: {},
							milestones,
							// @ts-ignore
							network: {
								// @ts-ignore
								address: {
									base58: 12,
									bech32m: "ark",
								},
							},
						});

						// Genesis Block
						const genesisBlock = await this.generateCryptoGenesisBlock(genesisWallet, delegates, flags);

						writeJSONSync(
							resolve(cryptoConfigDestination, "network.json"),
							this.generateCryptoNetwork(genesisBlock.payloadHash, flags),
							{ spaces: 4 },
						);

						writeJSONSync(resolve(cryptoConfigDestination, "genesisBlock.json"), genesisBlock, {
							spaces: 4,
						});

						writeFileSync(
							resolve(cryptoConfigDestination, "index.ts"),
							[
								'import genesisBlock from "./genesisBlock.json";',
								'import milestones from "./milestones.json";',
								'import network from "./network.json";',
								"",
								`export const ${flags.network} = { genesisBlock, milestones, network };`,
								"",
							].join("\n"),
						);
					},
					title: "Generate crypto network configuration.",
				},
				{
					task: async () => {
						writeJSONSync(resolve(coreConfigDestination, "peers.json"), this.generatePeers(flags), {
							spaces: 4,
						});

						writeJSONSync(
							resolve(coreConfigDestination, "delegates.json"),
							{ secrets: delegates.map((d) => d.passphrase) },
							{ spaces: 4 },
						);

						writeFileSync(resolve(coreConfigDestination, ".env"), this.generateEnvironmentVariables(flags));

						writeJSONSync(resolve(coreConfigDestination, "app.json"), this.generateApp(flags), {
							spaces: 4,
						});
					},
					title: "Generate Core network configuration.",
				},
			]);

			this.logger.info(`Configuration generated on location: ${coreConfigDestination}`);
		} catch (error) {
			console.log(error);
		}
	}

	private generateCryptoNetwork(nethash: string, options: Options) {
		return {
			address: {
				base58: options.pubKeyHash,
				bech32m: "ark",
			},
			aip20: 0,
			bip32: {
				private: 70_615_956,
				public: 70_617_039,
			},
			client: {
				explorer: options.explorer,
				symbol: options.symbol,
				token: options.token,
			},
			messagePrefix: `${options.network} message:\n`,
			name: options.network,
			nethash,
			pubKeyHash: options.pubKeyHash,
			slip44: 1,
			wif: options.wif,
		};
	}

	private generateCryptoMilestones(options: Options) {
		return [
			{
				activeDelegates: options.delegates,
				aip11: true,
				block: {
					maxPayload: options.maxBlockPayload,
					maxTransactions: options.maxTxPerBlock,
					version: 0,
				},
				blocktime: options.blocktime,
				epoch: new Date(options.epoch).toISOString(),
				height: 1,
				multiPaymentLimit: 256,
				reward: "0",
				vendorFieldLength: options.vendorFieldLength,
			},
			{
				height: options.rewardHeight,
				reward: options.rewardAmount,
			},
		];
	}

	private async generateCryptoGenesisBlock(genesisWallet, delegates, options: Options) {
		const premineWallet: Wallet = await this.createWallet(options.pubKeyHash);

		let transactions = [];

		if (options.distribute) {
			transactions = transactions.concat(
				...(await this.createTransferTransactions(
					premineWallet,
					delegates,
					options.premine,
					options.pubKeyHash,
				)),
			);
		} else {
			transactions = transactions.concat(
				await this.createTransferTransaction(premineWallet, genesisWallet, options.premine, options.pubKeyHash),
			);
		}

		transactions = transactions.concat(
			...(await this.buildDelegateTransactions(delegates, options.pubKeyHash)),
			...(await this.buildVoteTransactions(delegates, options.pubKeyHash)),
		);

		return this.createGenesisBlock(premineWallet.keys, transactions, 0);
	}

	private generateEnvironmentVariables(options: Options): string {
		let result = "";

		result += "CORE_LOG_LEVEL=info\n";
		result += "CORE_LOG_LEVEL_FILE=info\n\n";

		result += `CORE_DB_HOST=${options.coreDBHost}\n`;
		result += `CORE_DB_PORT=${options.coreDBPort}\n`;
		result += options.coreDBUsername ? `CORE_DB_USERNAME=${options.coreDBUsername}\n` : "";
		result += options.coreDBPassword ? `CORE_DB_PASSWORD=${options.coreDBPassword}\n` : "";
		result += options.coreDBDatabase ? `CORE_DB_DATABASE=${options.coreDBDatabase}\n\n` : "\n";

		result += "CORE_P2P_HOST=0.0.0.0\n";
		result += `CORE_P2P_PORT=${options.coreP2PPort}\n\n`;

		result += "CORE_API_HOST=0.0.0.0\n";
		result += `CORE_API_PORT=${options.coreAPIPort}\n\n`;

		result += "CORE_WEBHOOKS_HOST=0.0.0.0\n";
		result += `CORE_WEBHOOKS_PORT=${options.coreWebhooksPort}\n\n`;

		result += "CORE_MANAGER_HOST=0.0.0.0\n";
		result += `CORE_MANAGER_PORT=${options.coreMonitorPort}\n\n`;

		return result;
	}

	private generatePeers(options: Options): { list: { ip: string; port: number }[] } {
		if (options.peers === "") {
			return { list: [] };
		}

		const list = options.peers
			.replace(" ", "")
			.split(",")
			.map((peer) => {
				const [ip, port] = peer.split(":");

				return {
					ip,
					port: Number.isNaN(Number.parseInt(port)) ? options.coreP2PPort : Number.parseInt(port),
				};
			});

		return { list };
	}

	private generateApp(options: Options): any {
		const dynamicFees: DynamicFees = {
			addonBytes: {},
			enabled: undefined,
			minFeeBroadcast: undefined,
			minFeePool: undefined,
		};

		if (Object.keys(dynamicFees.addonBytes).length === 0) {
			// @ts-ignore
			delete dynamicFees.addonBytes;
		}

		return readJSONSync(resolve(__dirname, "../../bin/config/testnet/app.json"));
	}

	private async generateCoreDelegates(activeDelegates: number, pubKeyHash: number): Promise<Wallet[]> {
		const wallets: Wallet[] = [];

		for (let index = 0; index < activeDelegates; index++) {
			const delegateWallet: Wallet = await this.createWallet(pubKeyHash);
			delegateWallet.username = `genesis_${index + 1}`;

			wallets.push(delegateWallet);
		}

		return wallets;
	}

	private async createWallet(pubKeyHash: number): Promise<Wallet> {
		const passphrase = generateMnemonic(256);

		const keys: Interfaces.IKeyPair = await this.app
			.get<IKeyPairFactory>(BINDINGS.Identity.KeyPairFactory)
			.fromMnemonic(passphrase);

		return {
			address: await this.app
				.get<IAddressFactory>(BINDINGS.Identity.AddressFactory)
				.fromPublicKey(keys.publicKey),
			keys,
			passphrase,
			username: undefined,
		};
	}

	private async createTransferTransaction(
		sender: Wallet,
		recipient: Wallet,
		amount: string,
		pubKeyHash: number,
		nonce = 1,
	) {
		return this.formatGenesisTransaction(
			(
				await this.app
					.resolve(TransferBuilder)
					.network(pubKeyHash)
					.nonce(nonce.toFixed(0))
					.recipientId(recipient.address)
					.amount(amount)
					.sign(sender.passphrase)
			).data,
			sender,
		);
	}

	private async createTransferTransactions(
		sender: Wallet,
		recipients: Wallet[],
		totalPremine: string,
		pubKeyHash: number,
	) {
		const amount: string = BigNumber.make(totalPremine).dividedBy(recipients.length).toString();

		const result = [];

		for (const [index, recipient] of recipients.entries()) {
			result.push(await this.createTransferTransaction(sender, recipient, amount, pubKeyHash, index + 1));
		}

		return result;
	}

	private async buildDelegateTransactions(senders: Wallet[], pubKeyHash: number) {
		const result = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await this.formatGenesisTransaction(
				(
					await this.app
						.resolve(DelegateRegistrationBuilder)
						.network(pubKeyHash)
						.nonce("1") // delegate registration tx is always the first one from sender
						.usernameAsset(sender.username)
						.fee(`${25 * 1e8}`)
						.sign(sender.passphrase)
				).data,
				sender,
			);
		}

		return result;
	}

	private async buildVoteTransactions(senders: Wallet[], pubKeyHash: number) {
		const result = [];

		for (const [index, sender] of senders.entries()) {
			result[index] = await this.formatGenesisTransaction(
				(
					await this.app
						.resolve(VoteBuilder)
						.network(pubKeyHash)
						.nonce("2") // vote transaction is always the 2nd tx from sender (1st one is delegate registration)
						.votesAsset([`+${sender.keys.publicKey}`])
						.fee(`${1 * 1e8}`)
						.sign(sender.passphrase)
				).data,
				sender,
			);
		}

		return result;
	}

	private async formatGenesisTransaction(transaction, wallet: Wallet) {
		Object.assign(transaction, {
			fee: BigNumber.ZERO,
			timestamp: 0,
		});
		transaction.signature = await this.app
			.get<ITransactionSigner>(BINDINGS.Transaction.Signer)
			.sign(transaction, wallet.keys);
		transaction.id = await this.app.get<ITransactionUtils>(BINDINGS.Transaction.Utils).getId(transaction);

		return transaction;
	}

	private async createGenesisBlock(keys: Interfaces.IKeyPair, transactions, timestamp: number) {
		transactions = transactions.sort((a, b) => {
			if (a.type === b.type) {
				return a.amount - b.amount;
			}

			return a.type - b.type;
		});

		let payloadLength = 0;
		let totalFee: BigNumber = BigNumber.ZERO;
		let totalAmount: BigNumber = BigNumber.ZERO;
		const allBytes: Buffer[] = [];

		for (const transaction of transactions) {
			const bytes: Buffer = await this.app
				.get<ITransactionSerializer>(BINDINGS.Transaction.Serializer)
				.getBytes(transaction);

			allBytes.push(bytes);

			payloadLength += bytes.length;
			totalFee = totalFee.plus(transaction.fee);
			totalAmount = totalAmount.plus(BigNumber.make(transaction.amount));
		}

		const payloadHash: Buffer = await this.app
			.get<IHashFactory>(BINDINGS.HashFactory)
			.sha256(Buffer.concat(allBytes));

		const block: any = {
			blockSignature: undefined,
			generatorPublicKey: keys.publicKey,
			height: 1,
			id: undefined,
			numberOfTransactions: transactions.length,
			payloadHash: payloadHash.toString("hex"),
			payloadLength,
			previousBlock: "0000000000000000000000000000000000000000000000000000000000000000",
			reward: "0",
			timestamp,
			totalAmount: totalAmount.toString(),
			totalFee: totalFee.toString(),
			transactions,
			version: 0,
		};

		block.id = await this.app.get<any>(BINDINGS.Block.IDFactory).make(block);

		block.blockSignature = await this.signBlock(block, keys);

		return block;
	}

	private async signBlock(block, keys: Interfaces.IKeyPair): Promise<string> {
		return this.app
			.get<Signatory>(BINDINGS.SignatureFactory)
			.sign(
				await this.app
					.get<IHashFactory>(BINDINGS.HashFactory)
					.sha256(this.app.get<IBlockSerializer>(BINDINGS.Block.Serializer).serialize(block, false)),
				Buffer.from(keys.privateKey, "hex"),
			);
	}
}
