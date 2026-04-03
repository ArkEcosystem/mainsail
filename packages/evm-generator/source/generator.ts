import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Deployer, Identifiers as EvmConsensusIdentifiers } from "@mainsail/evm-consensus";
import { Application } from "@mainsail/kernel";
import { assert, BigNumber } from "@mainsail/utils";

import { Identifiers as InternalIdentifiers } from "./identifiers.js";
import { loadValidators } from "./load-validators.js";

// pub(crate) struct InnerStorage {
//     pub accounts: heed::Database<AddressWrapper, CompressedBincode<StoredAccountInfo>>,
//     pub accounts_history: Option<
//         heed::Database<
//             HeedBlockNumber,
//             CompressedBincode<BTreeMap<Address, HistoricalAccountData>>,
//         >,
//     >,
//     pub commits: heed::Database<HeedBlockNumber, CompressedBincode<CommitReceipts>>,
//     pub contracts: heed::Database<HashWrapper, CompressedBincode<StoredBytecode>>,
//     pub legacy_attributes:
//         heed::Database<AddressWrapper, CompressedBincode<LegacyAccountAttributes>>,
//     pub legacy_cold_wallets:
//         heed::Database<LegacyAddressWrapper, CompressedBincode<LegacyColdWallet>>,
//     pub storage: heed::Database<
//         AddressWrapper,
//         StorageEntryWrapper,
//         heed::DefaultComparator,
//         StorageEntryDupSortCmp,
//     >,
//     // Carried over from previous database-service.ts lmdb backend
//     pub state: heed::Database<StaticStringWrapper, heed::types::SerdeBincode<Bytes>>,
//     pub proofs: heed::Database<HeedBlockNumber, CompressedBincode<ProofData>>,
//     pub blocks: heed::Database<HeedBlockNumber, CompressedBincode<BlockHeaderData>>,
//     pub blocks_hash_number: heed::Database<HashWrapper, HeedBlockNumber>,
//     pub transactions: heed::Database<StringWrapper, CompressedBincode<TransactionData>>,
//     pub transactions_hash_key: heed::Database<HashWrapper, heed::types::SerdeBincode<String>>,
//     //
// }

const TARGET_NUMBER_OF_BLOCKS = 1024;

@injectable()
export class Generator {
	@inject(InternalIdentifiers.Application)
	private app!: Application;

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly blockProcessor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

	@inject(Identifiers.Consensus.CommitState.Factory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.Validator.Repository)
	private readonly validatorsRepository!: Contracts.Validator.ValidatorRepository;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.State.Store)
	private stateStore!: Contracts.State.Store;

	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	public async generate(): Promise<void> {
		await this.#initialize();

		let blockNumber = 1;
		const round = 0;

		for (let index = 0; index < TARGET_NUMBER_OF_BLOCKS; index++) {
			const roundState = this.roundStateRepository.getRoundState(blockNumber, round);
			const registeredProposer = this.validatorsRepository.getValidator(roundState.proposer.blsPublicKey);
			assert.defined(registeredProposer);

			// TODO: ensure no future timestamp
			const previousBlock = this.store.getLastBlock();
			const nextBlockTimestamp = previousBlock.timestamp + 8000;

			const proposedBlock = await registeredProposer.prepareBlock(
				roundState.proposer.address,
				round,
				nextBlockTimestamp,
			);

			const proposal = await registeredProposer.propose(
				this.validatorSet.getValidatorIndexByWalletAddress(roundState.proposer.address),
				round,
				undefined,
				proposedBlock,
			);

			roundState.addProposal(proposal);

			// Gather consensus
			for (const { address, blsPublicKey } of this.validatorSet.getRoundValidators()) {
				if (blsPublicKey === roundState.proposer.blsPublicKey) {
					continue;
				}

				if (roundState.hasMajorityPrecommits()) {
					break;
				}

				const validator = this.validatorsRepository.getValidator(blsPublicKey);
				this.validatorSet.getValidatorIndexByWalletAddress(address);
				assert.defined(validator);

				const precommit = await validator.precommit(
					this.validatorSet.getValidatorIndexByWalletAddress(address),
					proposedBlock.number,
					round,
					proposedBlock.hash,
				);

				roundState.addPrecommit(precommit);
			}

			await proposal.deserializePayload();

			roundState.setProcessorResult(await this.blockProcessor.process(roundState));

			await this.blockProcessor.commit(roundState);

			blockNumber += 1;
		}

		await this.#shutdown();
	}

	async #initialize(): Promise<void> {
		const genesisBlockJson = this.app.config<Contracts.Crypto.CommitJson>("crypto.genesisBlock");
		assert.defined(genesisBlockJson);

		const genesisBlock = await this.commitFactory.fromJson(genesisBlockJson);

		await this.app.get<Deployer>(EvmConsensusIdentifiers.Internal.Deployer).deploy({
			generatorAddress: genesisBlock.block.proposer,
			initialBlockNumber: genesisBlock.block.number,
			initialSupply: this.#calculateInitialSupply(genesisBlockJson),
			timestamp: genesisBlock.block.timestamp,
		});

		await loadValidators(this.app);

		this.stateStore.setGenesisCommit(genesisBlock);
		await this.#processCommit(genesisBlock);
	}

	async #processCommit(commit: Contracts.Crypto.Commit): Promise<void> {
		const commitState = this.commitStateFactory(commit);
		const result = await this.blockProcessor.process(commitState);
		if (!result.success) {
			throw new Error(`Block is not processed.`);
		}

		commitState.setProcessorResult(result);
		await this.blockProcessor.commit(commitState);
	}

	#calculateInitialSupply(genesisBlock: Contracts.Crypto.CommitJson): string {
		const generatorAddress = genesisBlock.block.proposer;

		let supply = BigNumber.ZERO;

		for (const transaction of genesisBlock.block.transactions.filter((tx) => tx.from === generatorAddress)) {
			supply = supply.plus(transaction.value);
		}

		return supply.toString();
	}

	async #shutdown(): Promise<void> {
		for (const tag of ["evm", "validator", "transaction-pool", "rpc"]) {
			if (this.app.isBoundTagged(Identifiers.Evm.Instance, "instance", tag)) {
				{
					await this.app
						.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", tag)
						.dispose();
				}
			}
		}
	}
}
