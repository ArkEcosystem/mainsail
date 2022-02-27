import Interfaces, { BINDINGS, IConfiguration } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts, Utils } from "@arkecosystem/core-kernel";
import { DatabaseInteraction } from "@arkecosystem/core-state";
import Hapi from "@hapi/hapi";

import { Controller } from "./controller";

export class InternalController extends Controller {
	@Container.inject(Container.Identifiers.PeerProcessor)
	private readonly peerProcessor!: Contracts.P2P.PeerProcessor;

	@Container.inject(Container.Identifiers.PeerNetworkMonitor)
	private readonly peerNetworkMonitor!: Contracts.P2P.NetworkMonitor;

	@Container.inject(Container.Identifiers.DatabaseInteraction)
	private readonly databaseInteraction!: DatabaseInteraction;

	@Container.inject(Container.Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@Container.inject(Container.Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@Container.inject(Container.Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	@Container.inject(Container.Identifiers.TransactionPoolCollator)
	private readonly collator!: Contracts.TransactionPool.Collator;

	@Container.inject(BINDINGS.Configuration)
	private readonly configuration!: IConfiguration;

	@Container.inject(BINDINGS.Time.Slots)
	private readonly slots!: any;

	public async acceptNewPeer(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<void> {
		return this.peerProcessor.validateAndAcceptPeer({
			ip: (request.payload as any).ip,
		} as Contracts.P2P.Peer);
	}

	public emitEvent(request: Hapi.Request, h: Hapi.ResponseToolkit): boolean {
		this.events.dispatch((request.payload as any).event, (request.payload as any).body);
		return true;
	}

	public async getUnconfirmedTransactions(
		request: Hapi.Request,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.UnconfirmedTransactions> {
		const transactions: Interfaces.ITransaction[] = await this.collator.getBlockCandidateTransactions();

		return {
			poolSize: this.transactionPool.getPoolSize(),
			transactions: transactions.map((t) => t.serialized.toString("hex")),
		};
	}

	public async getCurrentRound(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Contracts.P2P.CurrentRound> {
		const lastBlock = this.blockchain.getLastBlock();

		const height = lastBlock.data.height + 1;
		const roundInfo = Utils.roundCalculator.calculateRound(height, this.configuration);

		const reward = this.configuration.getMilestone(height).reward;
		const delegates: Contracts.P2P.DelegateWallet[] = (
			await this.databaseInteraction.getActiveDelegates(roundInfo)
		).map((wallet) => ({
			...wallet.getData(),
			delegate: wallet.getAttribute("delegate"),
		}));

		const blockTimeLookup = await Utils.forgingInfoCalculator.getBlockTimeLookup(
			this.app,
			height,
			this.configuration,
		);

		const timestamp = this.slots.getTime();
		const forgingInfo = Utils.forgingInfoCalculator.calculateForgingInfo(
			timestamp,
			height,
			blockTimeLookup,
			this.configuration,
			this.slots,
		);

		return {
			canForge: forgingInfo.canForge,
			current: roundInfo.round,
			currentForger: delegates[forgingInfo.currentForger],
			delegates,
			lastBlock: lastBlock.data,
			nextForger: delegates[forgingInfo.nextForger],
			reward,
			timestamp: forgingInfo.blockTimestamp,
		};
	}

	public async getNetworkState(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Contracts.P2P.NetworkState> {
		return this.peerNetworkMonitor.getNetworkState();
	}

	public syncBlockchain(request: Hapi.Request, h: Hapi.ResponseToolkit): boolean {
		this.logger.debug("Blockchain sync check WAKEUP requested by forger");

		this.blockchain.forceWakeup();

		return true;
	}
}
