use std::{sync::Arc, u64};

use ctx::{
    CalculateRoundValidatorsContext, EvmOptions, ExecutionContext, GenesisContext,
    JsBlockHeaderData, JsCalculateRoundValidatorsContext, JsCommitData, JsCommitKey, JsEvmOptions,
    JsGenesisContext, JsPrepareNextCommitContext, JsPreverifyTransactionContext,
    JsTransactionContext, JsTransactionData, JsTransactionSimulateContext,
    JsTransactionViewContext, JsUpdateRewardsAndVotesContext, PrepareNextCommitContext,
    PreverifyTxContext, TxContext, TxSimulateContext, TxViewContext, UpdateRewardsAndVotesContext,
};
use logger::JsLogger;
use mainsail_evm_core::{
    account::AccountInfoExtended,
    db::{
        BlockContext, BlockHeaderData, CommitData, CommitKey, GenesisInfo, PendingCommit,
        PersistentDB, PersistentDBOptions, ProofData, TransactionData, TxnDatabaseReader,
    },
    legacy::{LegacyAccountAttributes, LegacyAddress, LegacyColdWallet},
    logger::LogLevel,
    logs_bloom,
    precompiles::MainsailPrecompiles,
    receipt::{TxReceipt, map_execution_result},
    state_changes::AccountUpdate,
    state_commit, state_root,
};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use result::{
    CommitResult, JsAccountInfoExtended, JsCommitResult, JsGetState, JsLegacyAttributes,
    JsLegacyColdWallet, JsTransactionReceipt, PreverifyTxResult, TxViewResult,
};
use revm::{
    Database, DatabaseCommit, DatabaseRef, ExecuteEvm, MainBuilder, MainContext,
    context::{
        BlockEnv, ContextTr, TxEnv,
        result::{EVMError, ExecutionResult, ResultAndState},
    },
    database::{State, TransitionAccount, WrapDatabaseRef, bal::EvmDatabaseError},
    handler::EvmTr,
    primitives::{Address, B256, Bytes, TxKind, U256, hex::ToHexExt, map::HashMap},
    state::AccountInfo,
};
use tokio::sync::Semaphore;

mod ctx;
mod logger;
mod result;
mod utils;

// A complex struct which cannot be exposed to JavaScript directly.
pub struct EvmInner {
    persistent_db: PersistentDB,

    // A pending commit consists of one or more transactions.
    //pending_commit: Option<PendingCommit>,
    pending_commits: HashMap<CommitKey, PendingCommit>,

    snapshot: Option<PendingCommit>,

    logger: JsLogger,
}

impl EvmInner {
    pub fn new(opts: EvmOptions) -> anyhow::Result<Self> {
        let logger = JsLogger::new(opts.logger_callback)
            .map_err(|err| anyhow::anyhow!("failed to create logger: {err}"))?;

        let mut db_opts = PersistentDBOptions::new(opts.path).with_logger(logger.inner());

        if let Some(history_size) = opts.history_size {
            if history_size > 0 {
                db_opts = db_opts.with_history_size(history_size)
            }
        }

        let persistent_db = PersistentDB::new(db_opts)
            .map_err(|err| anyhow::anyhow!("failed to open EVM database: {err}"))?;

        Ok(EvmInner {
            persistent_db,
            pending_commits: Default::default(),
            snapshot: None,
            logger,
        })
    }

    pub fn prepare_next_commit(&mut self, ctx: PrepareNextCommitContext) -> Result<()> {
        let genesis_block_number = self.genesis_block_number();
        if let Some(pending) = self.pending_commits.get(&ctx.block_context.commit_key) {
            // do not replace any pending commit, while still in bootstrapping phase.
            if pending.key.0 == genesis_block_number && ctx.block_context.commit_key == pending.key
            {
                return Ok(());
            }

            self.logger.log(
                LogLevel::Debug,
                format!(
                    "replacing existing pending commit {:?} for {:?}",
                    pending.key, ctx.block_context.commit_key
                ),
            );
        }

        let pending_commit = PendingCommit {
            key: ctx.block_context.commit_key,
            block_context: ctx.block_context,
            ..Default::default()
        };

        self.pending_commits
            .insert(pending_commit.key, pending_commit);

        Ok(())
    }

    pub fn view(&self, tx_ctx: TxViewContext) -> Result<TxViewResult> {
        let result = self.transact_read(ExecutionContext::new_read(None, tx_ctx));

        Ok(match result {
            Ok((r, _)) => {
                // if !r.is_success() {
                //     self.logger
                //         .log(LogLevel::Warn, format!("view call failed: {:?}", r));
                // }

                TxViewResult {
                    success: r.is_success(),
                    output: r.into_output(),
                }
            }
            Err(err) => {
                self.logger.log(
                    LogLevel::Warn,
                    format!("view call returned error: {:?}", err),
                );

                TxViewResult {
                    success: false,
                    output: None,
                }
            }
        })
    }

    pub fn code_at(
        &self,
        address: Address,
        block_number: Option<u64>,
    ) -> std::result::Result<Bytes, EVMError<String>> {
        let account = match block_number {
            None => self.persistent_db.basic_ref(address),
            Some(block_number) => {
                let result = self
                    .persistent_db
                    .get_historical_account_info(block_number, address);

                match result {
                    Ok((historical, _)) if historical.is_some() => Ok(historical),
                    Ok((_, missing_fallback)) if missing_fallback => {
                        self.persistent_db.basic_ref(address)
                    } // fallback
                    Ok(_) => Ok(None),
                    Err(err) => Err(err),
                }
            }
        }
        .map_err(|err| EVMError::Database(format!("account lookup failed: {}", err).into()))?;

        match account {
            Some(account) => {
                let code = self
                    .persistent_db
                    .code_by_hash_ref(account.code_hash)
                    .map_err(|err| {
                        EVMError::Database(format!("code lookup failed: {}", err).into())
                    })?;

                Ok(code.original_bytes())
            }
            None => Ok(Default::default()),
        }
    }

    pub fn storage_at(
        &self,
        address: Address,
        slot: U256,
    ) -> std::result::Result<U256, EVMError<String>> {
        match self.persistent_db.storage_ref(address, slot) {
            Ok(slot) => Ok(slot),
            Err(err) => Err(EVMError::Database(
                format!("storage lookup failed: {}", err).into(),
            )),
        }
    }

    pub fn initialize_genesis(
        &mut self,
        genesis_ctx: GenesisContext,
    ) -> std::result::Result<(), EVMError<String>> {
        match self.persistent_db.set_genesis_info(GenesisInfo {
            account: genesis_ctx.account,
            deployer_account: genesis_ctx.deployer_account,
            validator_contract: genesis_ctx.validator_contract,
            username_contract: genesis_ctx.username_contract,
            initial_block_number: genesis_ctx.initial_block_number,
            initial_supply: genesis_ctx.initial_supply,
        }) {
            Ok(_) => Ok(()),
            Err(err) => Err(EVMError::Database(
                format!("set_genesis_info failed: {}", err).into(),
            )),
        }
    }

    pub fn calculate_round_validators(
        &mut self,
        ctx: CalculateRoundValidatorsContext,
    ) -> std::result::Result<(), EVMError<String>> {
        if !self.pending_commits.contains_key(&ctx.commit_key) {
            return Err(EVMError::Custom(format!(
                "calculate_round_validators is missing commit key {:?}",
                ctx.commit_key
            )));
        }

        let genesis_info = self.genesis_info()?;

        let abi = ethers_contract::BaseContract::from(
            ethers_core::abi::parse_abi(&["function calculateRoundValidators(uint8 n) external"])
                .expect("encode abi"),
        );

        // encode abi into Bytes
        let calldata = abi
            .encode("calculateRoundValidators", ctx.round_validators)
            .expect("encode calculateRoundValidators");

        let nonce = self
            .get_account_nonce(&ctx.commit_key, genesis_info.deployer_account)
            .map_err(|err| EVMError::Database(format!("get_account_nonce: {err}").into()))?;

        match self.transact_write(ExecutionContext {
            block_context: Some(BlockContext {
                commit_key: ctx.commit_key,
                gas_limit: u64::MAX,
                timestamp: ctx.timestamp,
                validator_address: ctx.validator_address,
            }),
            from: genesis_info.deployer_account,
            to: Some(genesis_info.validator_contract),
            data: Bytes::from(calldata.0),
            value: U256::ZERO,
            nonce: Some(nonce),
            gas_limit: Some(u64::MAX),
            gas_price: 0,
            spec_id: ctx.spec_id,
            tx_hash: None,
        }) {
            Ok((receipt, _)) => {
                self.logger.log(
                    LogLevel::Debug,
                    format!(
                        "calculate_round_validators {:?} {:?}",
                        ctx.commit_key, receipt
                    ),
                );

                assert!(
                    receipt.is_success(),
                    "calculate_round_validators unsuccessful"
                );
                Ok(())
            }
            Err(err) => Err(EVMError::Database(
                format!("calculate_round_validators failed: {}", err).into(),
            )),
        }
    }

    pub fn update_rewards_and_votes(
        &mut self,
        ctx: UpdateRewardsAndVotesContext,
    ) -> std::result::Result<(), EVMError<String>> {
        let genesis_info = self.genesis_info()?;

        let nonce = self
            .get_account_nonce(&ctx.commit_key, genesis_info.deployer_account)
            .map_err(|err| EVMError::Database(format!("get_account_nonce: {err}").into()))?;

        let Some(mut pending_commit) = self.pending_commits.get_mut(&ctx.commit_key) else {
            return Err(EVMError::Custom(format!(
                "update_rewards_and_votes is missing commit key {:?}",
                ctx.commit_key
            )));
        };
        let mut rewards = HashMap::<Address, u128>::default();
        rewards.insert(ctx.validator_address, ctx.block_reward);

        match state_commit::apply_rewards(&mut self.persistent_db, &mut pending_commit, rewards) {
            Ok(_) => {
                // call into consensus contract to update votes
                let voters = pending_commit
                    .cache
                    .accounts
                    .keys()
                    .map(|k| ethers_core::types::Address::from_slice(k.0.as_slice()))
                    .collect::<Vec<ethers_core::types::Address>>();

                let abi = ethers_contract::BaseContract::from(
                    ethers_core::abi::parse_abi(&[
                        "function updateVoters(address[] calldata voters) external",
                    ])
                    .expect("encode abi"),
                );

                // encode abi into Bytes
                let calldata = abi
                    .encode("updateVoters", voters.clone())
                    .expect("encode updateVoters");

                match self.transact_write(ExecutionContext {
                    block_context: Some(BlockContext {
                        commit_key: ctx.commit_key,
                        gas_limit: u64::MAX,
                        timestamp: ctx.timestamp,
                        validator_address: ctx.validator_address,
                    }),
                    from: genesis_info.deployer_account,
                    to: Some(genesis_info.validator_contract),
                    data: Bytes::from(calldata.0),
                    value: U256::ZERO,
                    nonce: Some(nonce),
                    gas_limit: Some(u64::MAX),
                    gas_price: 0,
                    spec_id: ctx.spec_id,
                    tx_hash: None,
                }) {
                    Ok((receipt, _)) => {
                        self.logger.log(
                            LogLevel::Debug,
                            format!(
                                "vote_update {:?} {:?} {:?}",
                                ctx.commit_key,
                                receipt,
                                voters.len()
                            ),
                        );

                        assert!(receipt.is_success(), "vote_update unsuccessful");
                        Ok(())
                    }
                    Err(err) => Err(EVMError::Database(
                        format!("vote_update failed: {err}").into(),
                    )),
                }
            }
            Err(err) => Err(EVMError::Database(
                format!("apply_rewards failed: {err}").into(),
            )),
        }
    }

    pub fn get_account_info(
        &self,
        address: Address,
        block_number: Option<u64>,
    ) -> std::result::Result<AccountInfo, EVMError<String>> {
        let result = match block_number {
            None => self.persistent_db.basic_ref(address),
            Some(block_number) => {
                let result = self
                    .persistent_db
                    .get_historical_account_info(block_number, address);

                match result {
                    Ok((historical, _)) if historical.is_some() => Ok(historical),
                    Ok((_, missing_fallback)) if missing_fallback => {
                        self.persistent_db.basic_ref(address)
                    } // fallback
                    Ok(_) => Ok(None),
                    Err(err) => Err(err),
                }
            }
        };

        match result {
            Ok(account) => Ok(account.unwrap_or_default()),
            Err(err) => Err(EVMError::Database(
                format!("account lookup failed: {}", err).into(),
            )),
        }
    }

    pub fn get_account_info_extended(
        &self,
        address: Address,
        legacy_address: Option<LegacyAddress>,
    ) -> std::result::Result<AccountInfoExtended, EVMError<String>> {
        let mut info = self
            .persistent_db
            .basic_ref(address)
            .map_err(|err| {
                EVMError::Database(format!("account info lookup failed: {}", err).into())
            })?
            .unwrap_or_default();

        let mut legacy_attributes = Default::default();
        if let Some(legacy_address) = legacy_address {
            match self
                .persistent_db
                .get_legacy_cold_wallet(legacy_address)
                .map_err(|err| {
                    EVMError::Database(format!("legacy cold wallet lookup failed: {}", err).into())
                })? {
                Some(legacy_cold_wallet) if legacy_cold_wallet.merge_info.is_none() => {
                    // Merge cold wallet with account
                    info.balance = info.balance.saturating_add(legacy_cold_wallet.balance);
                    legacy_attributes = Some(legacy_cold_wallet.legacy_attributes);
                }
                _ => (),
            }
        }

        // Use cold wallet legacy attributes if present as they can't be present in both at the same time.
        let legacy_attributes = {
            match legacy_attributes {
                Some(legacy_attributes) => legacy_attributes,
                None => self
                    .persistent_db
                    .get_legacy_attributes(address)
                    .map_err(|err| {
                        EVMError::Database(
                            format!("legacy attributes lookup failed: {}", err).into(),
                        )
                    })?
                    .unwrap_or_default(),
            }
        };

        Ok(AccountInfoExtended {
            address,
            info,
            legacy_attributes,
        })
    }

    pub fn import_account_infos(
        &mut self,
        infos: Vec<AccountInfoExtended>,
    ) -> std::result::Result<(), EVMError<String>> {
        let genesis_block_number = self.genesis_block_number();

        let Some((_, pending)) = self
            .pending_commits
            .iter_mut()
            .find(|(key, _)| key.0 == genesis_block_number)
        else {
            return Err(EVMError::Custom(
                "import_account_infos requires the genesis pending commit; call prepare_next_commit first".into(),
            ));
        };

        for info in infos {
            if pending.cache.accounts.contains_key(&info.address) {
                return Err(EVMError::Custom(format!(
                    "import_account_infos: duplicate account {}",
                    info.address
                )));
            }

            let (address, info, legacy_attributes) = info.into_parts();
            pending.import_account(address, info, legacy_attributes);
        }

        Ok(())
    }

    pub fn import_legacy_cold_wallets(
        &mut self,
        wallets: Vec<LegacyColdWallet>,
    ) -> std::result::Result<(), EVMError<String>> {
        let genesis_block_number = self.genesis_block_number();

        let Some((_, pending)) = self
            .pending_commits
            .iter_mut()
            .find(|(key, _)| key.0 == genesis_block_number)
        else {
            return Err(EVMError::Custom(
                "import_legacy_cold_wallets requires the genesis pending commit; call prepare_next_commit first".into(),
            ));
        };

        for wallet in wallets {
            if pending.legacy_cold_wallets.contains_key(&wallet.address) {
                return Err(EVMError::Custom(format!(
                    "import_legacy_cold_wallets: duplicate wallet {:?}",
                    wallet.address
                )));
            }
            pending.legacy_cold_wallets.insert(wallet.address, wallet);
        }

        Ok(())
    }

    pub fn get_accounts(
        &self,
        offset: u64,
        limit: u64,
    ) -> std::result::Result<(Option<u64>, Vec<AccountInfoExtended>), EVMError<String>> {
        match self.persistent_db.get_accounts(offset, limit) {
            Ok((next_offset, accounts)) => Ok((next_offset, accounts)),
            Err(err) => Err(EVMError::Database(
                format!("failed reading accounts: {}", err).into(),
            )),
        }
    }

    pub fn get_legacy_attributes(
        &self,
        address: Address,
        legacy_address: Option<LegacyAddress>,
    ) -> std::result::Result<Option<LegacyAccountAttributes>, EVMError<String>> {
        if let Some(legacy_attributes) =
            self.persistent_db
                .get_legacy_attributes(address)
                .map_err(|err| {
                    EVMError::Database(format!("failed reading legacy attributes: {}", err).into())
                })?
        {
            return Ok(Some(legacy_attributes));
        }

        // Try fallback to legacy attributes from cold wallets
        let legacy_attributes = match legacy_address {
            Some(legacy_address) => {
                match self
                    .persistent_db
                    .get_legacy_cold_wallet(legacy_address)
                    .map_err(|err| {
                        EVMError::Database(
                            format!("legacy cold wallet attributes lookup failed: {}", err).into(),
                        )
                    })? {
                    Some(legacy_cold_wallet) => Some(legacy_cold_wallet.legacy_attributes),
                    None => None,
                }
            }
            None => None,
        };

        Ok(legacy_attributes)
    }

    pub fn get_legacy_cold_wallets(
        &self,
        offset: u64,
        limit: u64,
    ) -> std::result::Result<(Option<u64>, Vec<LegacyColdWallet>), EVMError<String>> {
        match self.persistent_db.get_legacy_cold_wallets(offset, limit) {
            Ok((next_offset, accounts)) => Ok((next_offset, accounts)),
            Err(err) => Err(EVMError::Database(
                format!("failed reading legacy cold wallets: {}", err).into(),
            )),
        }
    }

    pub fn get_receipts(
        &self,
        offset: u64,
        limit: u64,
    ) -> std::result::Result<(Option<u64>, Vec<(u64, Vec<(B256, TxReceipt)>)>), EVMError<String>>
    {
        match self.persistent_db.get_receipts(offset, limit) {
            Ok((next_offset, receipts)) => Ok((next_offset, receipts)),
            Err(err) => Err(EVMError::Database(
                format!("failed reading receipts: {}", err).into(),
            )),
        }
    }

    pub fn get_receipts_by_block_number(
        &self,
        block_number: u64,
    ) -> std::result::Result<HashMap<B256, TxReceipt>, EVMError<String>> {
        match self
            .persistent_db
            .get_receipts_by_block_number(block_number)
        {
            Ok(receipts) => Ok(receipts),
            Err(err) => Err(EVMError::Database(
                format!("failed reading receipts by block number: {}", err).into(),
            )),
        }
    }

    pub fn get_receipts_by_block_range(
        &self,
        from_block_number: u64,
        to_block_number: u64,
    ) -> std::result::Result<Vec<(u64, Vec<(B256, TxReceipt)>)>, EVMError<String>> {
        match self
            .persistent_db
            .get_receipts_by_block_range(from_block_number, to_block_number)
        {
            Ok(receipts) => Ok(receipts),
            Err(err) => Err(EVMError::Database(
                format!("failed reading receipts by block range: {}", err).into(),
            )),
        }
    }

    pub fn preverify_transaction(
        &self,
        ctx: PreverifyTxContext,
    ) -> std::result::Result<PreverifyTxResult, EVMError<String>> {
        let mut pending_commit = PendingCommit::new(Default::default());

        // Make legacy balance available to account in pending commit during preverification
        if let Some(legacy_address) = ctx.legacy_address {
            match self
                .persistent_db
                .get_legacy_cold_wallet(legacy_address)
                .map_err(|err| {
                    EVMError::Database(format!("failed reading legacy cold wallet: {}", err).into())
                })? {
                Some(legacy_cold_wallet) if legacy_cold_wallet.merge_info.is_none() => {
                    let mut legacy_balances = HashMap::<Address, u128>::default();
                    legacy_balances.insert(
                        ctx.from,
                        legacy_cold_wallet.balance.try_into().expect("fit u128"),
                    );
                    state_commit::apply_rewards(
                        &self.persistent_db,
                        &mut pending_commit,
                        legacy_balances,
                    )
                    .map_err(|err| {
                        EVMError::Database(
                            format!("failed to apply legacy balance: {}", err).into(),
                        )
                    })?;
                }
                _ => (),
            }
        }

        let db_reader = TxnDatabaseReader::new(&self.persistent_db).map_err(|err| {
            EVMError::Database(format!("failed to create tx database reader {}", err))
        })?;

        let state_db = State::builder()
            .with_bundle_update()
            .with_cached_prestate(std::mem::take(&mut pending_commit.cache))
            .with_database(WrapDatabaseRef(db_reader))
            .build();

        let evm = revm::Context::mainnet()
            .with_db(state_db)
            .modify_cfg_chained(|cfg| {
                cfg.spec = ctx.spec_id;
            })
            .modify_block_chained(|block_env: &mut BlockEnv| {
                block_env.gas_limit = ctx.block_gas_limit;
            })
            .modify_tx_chained(|tx_env: &mut TxEnv| {
                tx_env.gas_limit = ctx.gas_limit;
                tx_env.gas_price = ctx.gas_price;
                tx_env.gas_priority_fee = None;
                tx_env.caller = ctx.from;
                tx_env.value = ctx.value;
                tx_env.nonce = ctx.nonce;
                tx_env.kind = match ctx.to {
                    Some(recipient) => TxKind::Call(recipient),
                    None => TxKind::Create,
                };

                tx_env.data = ctx.data;
            })
            .build_mainnet()
            .with_precompiles(MainsailPrecompiles::new(ctx.spec_id));

        let ctx = evm.ctx_ref();
        let result = revm::handler::validation::validate_initial_tx_gas(
            ctx.tx(),
            (*ctx.cfg().spec()).into(),
            false,
            false,
            0,
        );

        Ok(match result {
            Ok(result) => PreverifyTxResult {
                success: true,
                initial_gas_used: result.initial_total_gas(),
                ..Default::default()
            },
            Err(err) => PreverifyTxResult {
                error: Some(format!("preverify failed: {}", err.to_string())),
                ..Default::default()
            },
        })
    }

    pub fn get_receipt(
        &self,
        block_number: u64,
        tx_hash: B256,
    ) -> std::result::Result<Option<TxReceipt>, EVMError<String>> {
        match self.persistent_db.get_receipt(block_number, tx_hash) {
            Ok((_, receipt)) => Ok(receipt),
            Err(err) => Err(EVMError::Database(
                format!("failed reading receipt: {}", err).into(),
            )),
        }
    }

    pub fn simulate(
        &self,
        ctx: TxSimulateContext,
    ) -> std::result::Result<TxReceipt, EVMError<String>> {
        match self.transact_read(ctx.into()) {
            Ok((result, cumulative_gas_used)) => {
                let receipt = map_execution_result(result, cumulative_gas_used);
                Ok(receipt)
            }
            Err(err) => match err {
                EVMError::Transaction(err) => Err(EVMError::Transaction(err)),
                EVMError::Database(err) => Err(EVMError::Database(err.to_string())),
                _ => {
                    panic!("fatal evm err {:?}", err);
                }
            },
        }
    }

    pub fn process(
        &mut self,
        tx_ctx: TxContext,
    ) -> std::result::Result<TxReceipt, EVMError<String>> {
        let commit_key = tx_ctx.commit_key;

        let (committed, _) = self
            .persistent_db
            .get_receipt(commit_key.0, tx_ctx.tx_hash)
            .map_err(|err| EVMError::Database(format!("commit receipt lookup: {}", err).into()))?;
        if committed {
            return Err(EVMError::Custom(format!(
                "cannot process transaction {}: block {} was already committed",
                tx_ctx.tx_hash, commit_key.0
            )));
        }

        // A legacy cold-wallet merge mutates the pending commit *before* the transaction
        // executes (so the tx can spend the merged balance). If the tx then fails it is
        // dropped from the block, and an orphaned merge would diverge this validator's state
        // root from nodes that replay the block. Snapshot the pending commit before such a
        // merge so we can restore it on failure. This runs only for the first transaction of
        // a legacy sender — a one-time, migration-era event — so the clone is not a hot path.
        let mut merge_restore: Option<PendingCommit> = None;

        // Without a pending commit there is no block env to execute against and no
        // state write-back — the tx would run against block 0 and return a plausible
        // receipt while never entering the block. Fail loudly instead.
        let Some(mut pending) = self.pending_commits.get_mut(&commit_key) else {
            return Err(EVMError::Custom(format!(
                "process called with unknown commit key {:?}; call prepare_next_commit first",
                commit_key
            )));
        };

        let block_context = Some(pending.block_context.clone());

        {
            // Make legacy cold wallet balance available to pending commit if not already present
            if let Some(legacy_address) = tx_ctx.legacy_address {
                if !pending
                    .merged_legacy_cold_wallets
                    .contains_key(&tx_ctx.from)
                {
                    // Make legacy balance available to account in pending commit
                    match self
                        .persistent_db
                        .get_legacy_cold_wallet(legacy_address)
                        .map_err(|err| {
                            EVMError::Database(
                                format!("failed reading legacy cold wallet: {}", err).into(),
                            )
                        })? {
                        Some(legacy_cold_wallet) if legacy_cold_wallet.merge_info.is_none() => {
                            // Snapshot before the merge so a later transaction failure can
                            // undo it. (An `apply_rewards` error is already self-healing: it
                            // restores the prestate cache and never sets the bookkeeping.)
                            merge_restore = Some(pending.clone());

                            let mut legacy_balances = HashMap::<Address, u128>::default();
                            legacy_balances.insert(
                                tx_ctx.from,
                                legacy_cold_wallet.balance.try_into().expect("fit u128"),
                            );

                            state_commit::apply_rewards(
                                &mut self.persistent_db,
                                &mut pending,
                                legacy_balances,
                            )
                            .map_err(|err| {
                                EVMError::Database(
                                    format!("failed to apply legacy balance: {}", err).into(),
                                )
                            })?;

                            pending
                                .merged_legacy_cold_wallets
                                .insert(tx_ctx.from, Some((tx_ctx.tx_hash, legacy_address)));
                        }
                        _ => {
                            // Prevent subsequent look ups for same sender in same commit
                            pending.merged_legacy_cold_wallets.insert(tx_ctx.from, None);
                        }
                    }
                }
            }
        }

        match self.transact_write(ExecutionContext::new_write(block_context, tx_ctx)) {
            Ok((result, cumulative_gas_used)) => {
                let receipt = map_execution_result(result, cumulative_gas_used);
                Ok(receipt)
            }
            Err(err) => {
                // The transaction is dropped from the block; undo any legacy cold-wallet
                // merge applied for it so the committed state never carries an orphaned merge.
                if let Some(restore) = merge_restore {
                    self.pending_commits.insert(commit_key, restore);
                }

                match err {
                    EVMError::Transaction(err) => Err(EVMError::Transaction(err)),
                    EVMError::Database(err) => Err(EVMError::Database(err.to_string())),
                    _ => {
                        panic!("fatal evm err {:?}", err);
                    }
                }
            }
        }
    }

    pub fn commit(
        &mut self,
        commit_key: CommitKey,
        commit_data: Option<CommitData>,
    ) -> std::result::Result<Vec<AccountUpdate>, EVMError<String>> {
        if !self.pending_commits.contains_key(&commit_key) {
            return Err(EVMError::Custom(format!(
                "commit is missing commit key {:?}",
                commit_key
            )));
        }

        let pending_commit = self.take_pending_commit(commit_key);

        // self.logger.log(
        //     LogLevel::Info,
        //     format!(
        //         "committing {:?} with {} transitions",
        //         commit_key,
        //         pending_commit.transitions.transitions.len(),
        //     ),
        // );

        match state_commit::commit_to_db(&mut self.persistent_db, pending_commit, commit_data) {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(format!("commit failed: {}", err).into())),
        }
    }

    pub fn state_root(
        &mut self,
        commit_key: CommitKey,
        current_hash: B256,
    ) -> std::result::Result<String, EVMError<String>> {
        let Some(genesis_info) = self.persistent_db.genesis_info.as_ref() else {
            return Err(EVMError::Custom("genesis not initialized".into()));
        };

        let Some(pending_commit) = self.pending_commits.get_mut(&commit_key) else {
            return Err(EVMError::Custom(format!(
                "state_root is missing commit key {:?}",
                commit_key
            )));
        };

        let result = state_root::calculate(genesis_info, pending_commit, current_hash);

        match result {
            Ok(result) => Ok(result.encode_hex()),
            Err(err) => Err(EVMError::Database(
                format!("state_root failed: {}", err).into(),
            )),
        }
    }

    pub fn logs_bloom(
        &self,
        commit_key: CommitKey,
    ) -> std::result::Result<String, EVMError<String>> {
        let Some(pending_commit) = self.pending_commits.get(&commit_key) else {
            return Err(EVMError::Custom(format!(
                "logs_bloom is missing commit key {:?}",
                commit_key
            )));
        };

        let result = logs_bloom::calculate(pending_commit);

        match result {
            Ok(result) => Ok(result.encode_hex()),
            Err(err) => Err(EVMError::Database(
                format!("logs_bloom failed: {}", err).into(),
            )),
        }
    }

    pub fn is_empty(&self) -> std::result::Result<bool, EVMError<String>> {
        let result = self.persistent_db.is_empty();

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("is_empty failed: {}", err).into(),
            )),
        }
    }

    pub fn get_state(&self) -> std::result::Result<(u64, u64), EVMError<String>> {
        let result = self.persistent_db.get_state();

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_state failed: {}", err).into(),
            )),
        }
    }

    pub fn get_block_header_data(
        &self,
        block_number: u64,
    ) -> std::result::Result<Option<BlockHeaderData>, EVMError<String>> {
        let result = self.persistent_db.get_block_header_data(block_number);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_block_header_bytes failed: {}", err).into(),
            )),
        }
    }

    pub fn get_block_number_by_hash(
        &self,
        block_hash: B256,
    ) -> std::result::Result<Option<u64>, EVMError<String>> {
        let result = self.persistent_db.get_block_number_by_hash(block_hash);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_block_number_by_hash failed: {}", err).into(),
            )),
        }
    }

    pub fn get_commit_data(
        &self,
        block_number: u64,
    ) -> std::result::Result<
        Option<(ProofData, BlockHeaderData, Vec<TransactionData>)>,
        EVMError<String>,
    > {
        let Some(proof) = self
            .persistent_db
            .get_proof_data(block_number)
            .map_err(|err| EVMError::Database(format!("get_proof_data failed: {}", err).into()))?
        else {
            return Ok(None);
        };

        let header = self
            .persistent_db
            .get_block_header_data(block_number)
            .map_err(|err| {
                EVMError::Database(format!("get_block_header_data failed: {}", err).into())
            })?
            .ok_or_else(|| EVMError::Custom("header not found".into()))?;

        let mut txs = Vec::with_capacity(header.transactions_count as usize);

        for i in 0..header.transactions_count {
            let key = format!("{block_number}-{i}");
            let tx_data = self.get_transaction_data(key)?.ok_or_else(|| {
                EVMError::Custom(format!("tx {block_number}-{i} not found").into())
            })?;

            txs.push(tx_data);
        }

        Ok(Some((proof, header, txs)))
    }

    pub fn get_commits_by_block_range(
        &self,
        from_block_number: u64,
        to_block_number: u64,
        max_bytes: u64,
    ) -> std::result::Result<
        Vec<(ProofData, BlockHeaderData, Vec<TransactionData>)>,
        EVMError<String>,
    > {
        match self.persistent_db.get_commits_by_block_range(
            from_block_number,
            to_block_number,
            max_bytes,
        ) {
            Ok(commits) => Ok(commits),
            Err(err) => Err(EVMError::Database(
                format!("failed reading commits by block range: {}", err).into(),
            )),
        }
    }

    pub fn get_transaction_data(
        &self,
        key: String,
    ) -> std::result::Result<Option<TransactionData>, EVMError<String>> {
        let result = self.persistent_db.get_transaction_data(key);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_transaction_data failed: {}", err).into(),
            )),
        }
    }

    pub fn get_transaction_key_by_hash(
        &self,
        tx_hash: B256,
    ) -> std::result::Result<Option<String>, EVMError<String>> {
        let result = self.persistent_db.get_transaction_key_by_hash(tx_hash);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_transaction_key_by_hash failed: {}", err).into(),
            )),
        }
    }

    pub fn snapshot(&mut self, commit_key: CommitKey) -> std::result::Result<(), EVMError<String>> {
        self.logger.inner().log(
            LogLevel::Debug,
            format!("taking snapshot of commit {:?}", commit_key),
        );

        let _ = std::mem::replace(
            &mut self.snapshot,
            self.pending_commits.get(&commit_key).cloned(),
        );

        Ok(())
    }

    pub fn rollback(&mut self, commit_key: CommitKey) -> std::result::Result<(), EVMError<String>> {
        self.logger.inner().log(
            LogLevel::Debug,
            format!("rolling back to commit {:?}", commit_key),
        );

        match self.snapshot.take() {
            Some(commit) if commit.key == commit_key => {
                if !self.pending_commits.contains_key(&commit_key) {
                    return Err(EVMError::Custom(format!(
                        "rollback is missing commit key {:?}",
                        commit_key
                    )));
                }
                self.pending_commits.insert(commit_key, commit);

                Ok(())
            }
            Some(commit) => Err(EVMError::Custom(
                format!(
                    "rollback commit key mismatch ({:?}, {:?})",
                    commit.key, commit_key
                )
                .into(),
            )),
            None => Err(EVMError::Custom(
                format!("rollback to non-existent commit ({:?})", commit_key).into(),
            )),
        }
    }

    pub fn dispose(&mut self) -> std::result::Result<(), EVMError<String>> {
        // replace to drop any reference to logging hook
        self.logger = JsLogger::new(None)
            .map_err(|err| EVMError::Custom(format!("close logger err={err}")))?;

        Ok(())
    }

    /// Executes `ctx` and writes the result into the pending commit (`&mut self`).
    /// For read-only calls that must not mutate state, use `transact_read`.
    fn transact_write(
        &mut self,
        ctx: ExecutionContext,
    ) -> std::result::Result<
        (ExecutionResult, u64),
        EVMError<EvmDatabaseError<mainsail_evm_core::db::Error>>,
    > {
        let mut state_builder = State::builder().with_bundle_update();

        if let Some(commit_key) = ctx.block_context.as_ref().map(|b| &b.commit_key) {
            if let Some(pending_commit) = self.pending_commits.get_mut(commit_key) {
                state_builder =
                    state_builder.with_cached_prestate(std::mem::take(&mut pending_commit.cache));
            }
        }

        let db_reader = TxnDatabaseReader::new(&self.persistent_db)
            .map_err(|err| EVMError::Database(EvmDatabaseError::Database(err)))?;

        let state_db = state_builder
            .with_database(WrapDatabaseRef(db_reader))
            .build();

        let mut evm = revm::Context::mainnet()
            .with_db(state_db)
            .modify_cfg_chained(|cfg| {
                cfg.spec = ctx.spec_id;
                cfg.disable_nonce_check = ctx.nonce.is_none();
            })
            .modify_block_chained(|block_env: &mut BlockEnv| {
                let Some(block_ctx) = ctx.block_context.as_ref() else {
                    return;
                };

                block_env.number = U256::from(block_ctx.commit_key.0);
                block_env.beneficiary = block_ctx.validator_address;
                block_env.timestamp = U256::from(block_ctx.timestamp);
                block_env.gas_limit = block_ctx.gas_limit;
                block_env.difficulty = U256::ZERO;
            })
            .modify_tx_chained(|tx_env: &mut TxEnv| {
                tx_env.gas_limit = ctx.gas_limit.unwrap_or(u64::MAX);
                tx_env.gas_price = ctx.gas_price;
                tx_env.gas_priority_fee = None;
                tx_env.caller = ctx.from;
                tx_env.value = ctx.value;
                tx_env.nonce = ctx.nonce.unwrap_or_default();
                tx_env.kind = match ctx.to {
                    Some(recipient) => TxKind::Call(recipient),
                    None => TxKind::Create,
                };

                tx_env.data = ctx.data;
            })
            .build_mainnet()
            .with_precompiles(MainsailPrecompiles::new(ctx.spec_id));

        let result = evm.replay();

        match result {
            Ok(result) => {
                let ResultAndState { state, result } = result;

                let mut cumulative_gas_used = 0;

                // Update state if transaction is part of a commit
                if let Some(commit_key) = ctx.block_context.as_ref().map(|b| &b.commit_key) {
                    let state_db = evm.db_mut();
                    state_db.commit(state);

                    if let Some(pending_commit) = self.pending_commits.get_mut(commit_key) {
                        pending_commit.cache = std::mem::take(&mut state_db.cache);

                        if let Some(tx_hash) = ctx.tx_hash {
                            pending_commit.cumulative_gas_used += result.tx_gas_used();
                            pending_commit.results.insert(
                                tx_hash,
                                (result.clone(), pending_commit.cumulative_gas_used),
                            );
                            cumulative_gas_used = pending_commit.cumulative_gas_used;
                        }

                        pending_commit.transitions.add_transitions(
                            state_db
                                .transition_state
                                .take()
                                .unwrap_or_default()
                                .transitions
                                .into_iter()
                                .collect::<Vec<(Address, TransitionAccount)>>(),
                        );
                    }
                }

                Ok((result, cumulative_gas_used))
            }
            Err(err) => {
                // revm validates the tx before mutating state, so on a recoverable error
                // nothing was committed and `state_db.cache` still holds the prestate we
                // moved out of the pending commit. Hand it back so a failed tx is a no-op
                // on the pending commit instead of leaving it empty — otherwise the next
                // tx in this block executes against committed-only state and the forged
                // block's state root diverges from honest re-execution.
                if let Some(commit_key) = ctx.block_context.as_ref().map(|b| &b.commit_key) {
                    let state_db = evm.db_mut();
                    if let Some(pending_commit) = self.pending_commits.get_mut(commit_key) {
                        pending_commit.cache = std::mem::take(&mut state_db.cache);
                    }
                }
                Err(err)
            }
        }
    }

    /// Executes `ctx` read-only: runs against committed state and throws the
    /// resulting state away — no pending-commit prestate, no write-back, so `&self`.
    /// (Contrast `transact_write`, which is `&mut self` and folds the result into the
    /// pending commit while a block is being built.)
    fn transact_read(
        &self,
        ctx: ExecutionContext,
    ) -> std::result::Result<
        (ExecutionResult, u64),
        EVMError<EvmDatabaseError<mainsail_evm_core::db::Error>>,
    > {
        let db_reader = TxnDatabaseReader::new(&self.persistent_db)
            .map_err(|err| EVMError::Database(EvmDatabaseError::Database(err)))?;

        let state_db = State::builder()
            .with_bundle_update()
            .with_database(WrapDatabaseRef(db_reader))
            .build();

        let mut evm = revm::Context::mainnet()
            .with_db(state_db)
            .modify_cfg_chained(|cfg| {
                cfg.spec = ctx.spec_id;
                cfg.disable_nonce_check = ctx.nonce.is_none();
            })
            .modify_block_chained(|block_env: &mut BlockEnv| {
                let Some(block_ctx) = ctx.block_context.as_ref() else {
                    return;
                };
                block_env.number = U256::from(block_ctx.commit_key.0);
                block_env.beneficiary = block_ctx.validator_address;
                block_env.timestamp = U256::from(block_ctx.timestamp);
                block_env.gas_limit = block_ctx.gas_limit;
                block_env.difficulty = U256::ZERO;
            })
            .modify_tx_chained(|tx_env: &mut TxEnv| {
                tx_env.gas_limit = ctx.gas_limit.unwrap_or(u64::MAX);
                tx_env.gas_price = ctx.gas_price;
                tx_env.gas_priority_fee = None;
                tx_env.caller = ctx.from;
                tx_env.value = ctx.value;
                tx_env.nonce = ctx.nonce.unwrap_or_default();
                tx_env.kind = match ctx.to {
                    Some(recipient) => TxKind::Call(recipient),
                    None => TxKind::Create,
                };
                tx_env.data = ctx.data;
            })
            .build_mainnet()
            .with_precompiles(MainsailPrecompiles::new(ctx.spec_id));

        let ResultAndState { result, .. } = evm.replay()?;
        Ok((result, 0))
    }

    fn get_account_nonce(
        &mut self,
        commit_key: &CommitKey,
        account: Address,
    ) -> std::result::Result<u64, mainsail_evm_core::db::Error> {
        if let Some(pending) = self.pending_commits.get(commit_key) {
            if pending.cache.accounts.contains_key(&account) {
                if let Some(cache) = pending.cache.accounts.get(&account) {
                    if let Some(account) = &cache.account {
                        return Ok(account.info.nonce);
                    }
                }
            }
        }

        if let Some(account_info) = self.persistent_db.basic(account)? {
            return Ok(account_info.nonce);
        }

        return Ok(Default::default());
    }

    fn take_pending_commit(&mut self, commit_key: CommitKey) -> PendingCommit {
        let pending_commit = self
            .pending_commits
            .remove(&commit_key)
            .expect("pending commit exists");

        if self.pending_commits.len() > 0 {
            self.logger.log(
                LogLevel::Debug,
                format!(
                    "taking {commit_key:?} and dropping {:?}",
                    self.pending_commits.keys().collect::<Vec<_>>()
                ),
            );
        }

        self.pending_commits.clear();
        self.snapshot.take();

        pending_commit
    }

    #[inline]
    fn genesis_block_number(&mut self) -> u64 {
        self.persistent_db
            .genesis_info
            .as_ref()
            .cloned()
            .unwrap_or_default()
            .initial_block_number
    }

    fn genesis_info(&self) -> std::result::Result<GenesisInfo, EVMError<String>> {
        self.persistent_db
            .genesis_info
            .as_ref()
            .cloned()
            .ok_or_else(|| EVMError::Custom("genesis not initialized".into()))
    }
}

// The EVM wrapper is exposed to JavaScript.

#[napi(js_name = "Evm")]
pub struct JsEvmWrapper {
    evm: Arc<parking_lot::RwLock<EvmInner>>,
    concurrency: Option<Arc<Semaphore>>, // None => unbounded (consensus/forger)
}

/// Pin the napi tokio runtime explicitly instead of relying on napi-rs's implicit default.
///
/// Mirrors napi's default (`new_multi_thread().enable_all()`), but states the blocking-pool size
/// outright: every EVM read/write runs via `spawn_blocking`, so `max_blocking_threads` is the real
/// concurrency ceiling. 512 == tokio's current default, kept comfortably under the LMDB reader table
/// (`PersistentDB::MAX_READERS == 2048`) so concurrent readers can never exhaust slots.
///
/// Runs once at addon load before the runtime is first used.
#[napi_derive::module_init]
fn init_tokio_runtime() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .max_blocking_threads(512)
        .build()
        .expect("failed to build EVM tokio runtime");

    napi::bindgen_prelude::create_custom_tokio_runtime(rt);
}

#[napi]
impl JsEvmWrapper {
    #[napi(constructor)]
    pub fn new(opts: JsEvmOptions) -> Result<Self> {
        let opts = EvmOptions::try_from(opts)?;
        let concurrency = opts
            .concurrency
            .map(|n| Arc::new(Semaphore::new(n as usize)));

        Ok(JsEvmWrapper {
            evm: Arc::new(parking_lot::RwLock::new(EvmInner::new(opts)?)),
            concurrency,
        })
    }

    #[napi]
    pub fn preverify_transaction<'env>(
        &self,
        env: &'env Env,
        tx_ctx: JsPreverifyTransactionContext,
    ) -> Result<PromiseRaw<'env, result::JsPreverifyTransactionResult>> {
        let ctx = PreverifyTxContext::try_from(tx_ctx)?;

        self.read(
            env,
            move |evm| evm.preverify_transaction(ctx),
            |_, result| Ok(result::JsPreverifyTransactionResult::new(result)),
        )
    }

    #[napi]
    pub fn view<'env>(
        &self,
        env: &'env Env,
        view_ctx: JsTransactionViewContext,
    ) -> Result<PromiseRaw<'env, result::JsViewResult>> {
        let ctx = TxViewContext::try_from(view_ctx)?;

        self.read(
            env,
            move |evm| evm.view(ctx),
            |_, result| Ok(result::JsViewResult::new(result)?),
        )
    }

    #[napi]
    pub fn process<'env>(
        &mut self,
        env: &'env Env,
        tx_ctx: JsTransactionContext,
    ) -> Result<PromiseRaw<'env, result::JsProcessResult>> {
        let ctx = TxContext::try_from(tx_ctx)?;

        self.write(
            env,
            move |evm| evm.process(ctx),
            |_, result| Ok(result::JsProcessResult::new(result)),
        )
    }

    #[napi]
    pub fn simulate<'env>(
        &self,
        env: &'env Env,
        tx_ctx: JsTransactionSimulateContext,
    ) -> Result<PromiseRaw<'env, result::JsSimulateResult>> {
        let ctx = TxSimulateContext::try_from(tx_ctx)?;

        self.read(
            env,
            move |evm| evm.simulate(ctx),
            |_, result| Ok(result::JsSimulateResult::new(result)),
        )
    }

    #[napi]
    pub fn initialize_genesis<'env>(
        &mut self,
        env: &'env Env,
        genesis_ctx: JsGenesisContext,
    ) -> Result<PromiseRaw<'env, ()>> {
        let ctx = GenesisContext::try_from(genesis_ctx)?;

        self.write(env, move |evm| evm.initialize_genesis(ctx), |_, _| Ok(()))
    }

    #[napi]
    pub fn prepare_next_commit<'env>(
        &mut self,
        env: &'env Env,
        ctx: JsPrepareNextCommitContext,
    ) -> Result<PromiseRaw<'env, ()>> {
        let ctx = PrepareNextCommitContext::try_from(ctx)?;

        self.write(env, move |evm| evm.prepare_next_commit(ctx), |_, _| Ok(()))
    }

    #[napi]
    pub fn calculate_round_validators<'env>(
        &mut self,
        env: &'env Env,
        ctx: JsCalculateRoundValidatorsContext,
    ) -> Result<PromiseRaw<'env, ()>> {
        let ctx = CalculateRoundValidatorsContext::try_from(ctx)?;

        self.write(
            env,
            move |evm| evm.calculate_round_validators(ctx),
            |_, _| Ok(()),
        )
    }

    #[napi]
    pub fn update_rewards_and_votes<'env>(
        &mut self,
        env: &'env Env,
        ctx: JsUpdateRewardsAndVotesContext,
    ) -> Result<PromiseRaw<'env, ()>> {
        let ctx = UpdateRewardsAndVotesContext::try_from(ctx)?;

        self.write(
            env,
            move |evm| evm.update_rewards_and_votes(ctx),
            |_, _| Ok(()),
        )
    }

    #[napi]
    pub fn get_account_info<'env>(
        &self,
        env: &'env Env,
        address: String,
        block_number: Option<BigInt>,
    ) -> Result<PromiseRaw<'env, result::JsAccountInfo>> {
        let address = utils::create_address_from_string(&address)?;

        let block_number = match block_number {
            Some(block_number) => Some(utils::convert_bigint_to_u64(block_number, "blockNumber")?),
            None => None,
        };

        self.read(
            env,
            move |evm| evm.get_account_info(address, block_number),
            |_, result| Ok(result::JsAccountInfo::new(result)?),
        )
    }

    #[napi]
    pub fn get_account_info_extended<'env>(
        &self,
        env: &'env Env,
        address: String,
        legacy_address: Option<String>,
    ) -> Result<PromiseRaw<'env, result::JsAccountInfoExtended>> {
        let address = utils::create_address_from_string(&address)?;
        let legacy_address = if let Some(legacy_address) = legacy_address {
            Some(utils::create_legacy_address_from_string(&legacy_address)?)
        } else {
            None
        };

        self.read(
            env,
            move |evm| evm.get_account_info_extended(address, legacy_address),
            |_, result| Ok(result::JsAccountInfoExtended::new(result)),
        )
    }

    #[napi]
    pub fn import_account_infos<'env>(
        &mut self,
        env: &'env Env,
        infos: Vec<JsAccountInfoExtended>,
    ) -> Result<PromiseRaw<'env, ()>> {
        let mut accounts: Vec<AccountInfoExtended> = Vec::with_capacity(infos.len());
        for info in infos {
            accounts.push(info.try_into()?);
        }

        self.write(
            env,
            move |evm| evm.import_account_infos(accounts),
            |_, _| Ok(()),
        )
    }

    #[napi]
    pub fn import_legacy_cold_wallets<'env>(
        &mut self,
        env: &'env Env,
        infos: Vec<JsLegacyColdWallet>,
    ) -> Result<PromiseRaw<'env, ()>> {
        let mut cold_wallets: Vec<LegacyColdWallet> = Vec::with_capacity(infos.len());
        for info in infos {
            cold_wallets.push(info.try_into()?);
        }

        self.write(
            env,
            move |evm| evm.import_legacy_cold_wallets(cold_wallets),
            |_, _| Ok(()),
        )
    }

    #[napi]
    pub fn get_accounts<'env>(
        &self,
        env: &'env Env,
        offset: BigInt,
        limit: BigInt,
    ) -> Result<PromiseRaw<'env, result::JsGetAccounts>> {
        let offset = utils::convert_bigint_to_u64(offset, "offset")?;
        let limit = utils::convert_bigint_to_u64(limit, "limit")?;

        self.read(
            env,
            move |evm| evm.get_accounts(offset, limit),
            |_, result| Ok(result::JsGetAccounts::new(result.0, result.1)),
        )
    }

    #[napi]
    pub fn get_legacy_attributes<'env>(
        &self,
        env: &'env Env,
        address: String,
        legacy_address: Option<String>,
    ) -> Result<PromiseRaw<'env, Option<JsLegacyAttributes>>> {
        let address = utils::create_address_from_string(&address)?;
        let legacy_address = if let Some(legacy_address) = legacy_address {
            Some(utils::create_legacy_address_from_string(&legacy_address)?)
        } else {
            None
        };

        self.read(
            env,
            move |evm| evm.get_legacy_attributes(address, legacy_address),
            |_, result| {
                Ok(match result {
                    Some(result) => Some(JsLegacyAttributes::new(result)),
                    None => None,
                })
            },
        )
    }

    #[napi]
    pub fn get_legacy_cold_wallets<'env>(
        &self,
        env: &'env Env,
        offset: BigInt,
        limit: BigInt,
    ) -> Result<PromiseRaw<'env, result::JsGetLegacyColdWallets>> {
        let offset = utils::convert_bigint_to_u64(offset, "offset")?;
        let limit = utils::convert_bigint_to_u64(limit, "limit")?;

        self.read(
            env,
            move |evm| evm.get_legacy_cold_wallets(offset, limit),
            |_, result| Ok(result::JsGetLegacyColdWallets::new(result.0, result.1)),
        )
    }

    #[napi]
    pub fn get_receipts<'env>(
        &self,
        env: &'env Env,
        offset: BigInt,
        limit: BigInt,
    ) -> Result<PromiseRaw<'env, result::JsGetReceipts>> {
        let offset = utils::convert_bigint_to_u64(offset, "offset")?;
        let limit = utils::convert_bigint_to_u64(limit, "limit")?;

        self.read(
            env,
            move |evm| evm.get_receipts(offset, limit),
            |_, result| Ok(result::JsGetReceipts::new(result.0, result.1)?),
        )
    }

    #[napi]
    pub fn get_receipts_by_block_number<'env>(
        &self,
        env: &'env Env,
        block_number: BigInt,
    ) -> Result<PromiseRaw<'env, HashMap<String, result::JsTransactionReceipt>>> {
        let block_number = utils::convert_bigint_to_u64(block_number, "blockNumber")?;

        self.read(
            env,
            move |evm| evm.get_receipts_by_block_number(block_number),
            |_, result| {
                Ok(result
                    .into_iter()
                    .map(|(k, v)| (format!("{:x}", k), JsTransactionReceipt::new(v)))
                    .collect())
            },
        )
    }

    #[napi]
    pub fn get_receipts_by_block_range<'env>(
        &self,
        env: &'env Env,
        from_block_number: BigInt,
        to_block_number: BigInt,
    ) -> Result<PromiseRaw<'env, result::JsGetReceipts>> {
        let from_block_number = utils::convert_bigint_to_u64(from_block_number, "fromBlockNumber")?;
        let to_block_number = utils::convert_bigint_to_u64(to_block_number, "toBlockNumber")?;

        self.read(
            env,
            move |evm| evm.get_receipts_by_block_range(from_block_number, to_block_number),
            |_, result| Ok(result::JsGetReceipts::new(None, result)?),
        )
    }

    #[napi]
    pub fn get_receipt<'env>(
        &self,
        env: &'env Env,
        block_number: BigInt,
        tx_hash: String,
    ) -> Result<PromiseRaw<'env, result::JsGetReceipt>> {
        let block_number = utils::convert_bigint_to_u64(block_number, "blockNumber")?;
        let tx_hash = utils::convert_string_to_b256(tx_hash)?;

        self.read(
            env,
            move |evm| evm.get_receipt(block_number, tx_hash),
            move |_, result| Ok(result::JsGetReceipt::new(result, block_number, tx_hash)),
        )
    }

    #[napi]
    pub fn code_at<'env>(
        &self,
        env: &'env Env,
        address: String,
        block_number: Option<BigInt>,
    ) -> Result<PromiseRaw<'env, String>> {
        let address = utils::create_address_from_string(&address)?;
        let block_number = match block_number {
            Some(block_number) => Some(utils::convert_bigint_to_u64(block_number, "blockNumber")?),
            None => None,
        };

        self.read(
            env,
            move |evm| evm.code_at(address, block_number),
            move |_, result| Ok(revm::primitives::hex::encode_prefixed(result.as_ref())),
        )
    }

    #[napi]
    pub fn storage_at<'env>(
        &self,
        env: &'env Env,
        address: String,
        slot: BigInt,
    ) -> Result<PromiseRaw<'env, String>> {
        let address = utils::create_address_from_string(&address)?;
        let slot = utils::convert_bigint_to_u256(slot, "slot")?;

        self.read(
            env,
            move |evm| evm.storage_at(address, slot),
            move |_, result| {
                Ok(revm::primitives::hex::encode_prefixed(
                    result.to_be_bytes::<32>(),
                ))
            },
        )
    }

    #[napi]
    pub fn commit<'env>(
        &mut self,
        env: &'env Env,
        commit_key: JsCommitKey,
        commit_data: Option<JsCommitData>,
    ) -> Result<PromiseRaw<'env, JsCommitResult>> {
        let commit_key = CommitKey::try_from(commit_key)?;
        let commit_data = if let Some(commit_data) = commit_data {
            Some(CommitData::try_from(commit_data)?)
        } else {
            None
        };

        self.write(
            env,
            move |evm| evm.commit(commit_key, commit_data),
            |_, result| {
                Ok(result::JsCommitResult::new(CommitResult {
                    dirty_accounts: result,
                })?)
            },
        )
    }

    #[napi]
    pub fn state_root<'env>(
        &mut self,
        env: &'env Env,
        commit_key: JsCommitKey,
        current_hash: String,
    ) -> Result<PromiseRaw<'env, String>> {
        let commit_key = CommitKey::try_from(commit_key)?;
        let current_hash = utils::convert_string_to_b256(current_hash)?;

        self.write(
            env,
            move |evm| evm.state_root(commit_key, current_hash),
            |_, result| Ok(result),
        )
    }

    #[napi]
    pub fn logs_bloom<'env>(
        &self,
        env: &'env Env,
        commit_key: JsCommitKey,
    ) -> Result<PromiseRaw<'env, String>> {
        let commit_key = CommitKey::try_from(commit_key)?;

        self.read(
            env,
            move |evm| evm.logs_bloom(commit_key),
            |_, result| Ok(result),
        )
    }

    #[napi]
    pub fn is_empty<'env>(&self, env: &'env Env) -> Result<PromiseRaw<'env, bool>> {
        self.read(env, move |evm| evm.is_empty(), |_, result| Ok(result))
    }

    #[napi]
    pub fn get_state<'env>(&self, env: &'env Env) -> Result<PromiseRaw<'env, JsGetState>> {
        self.read(
            env,
            move |evm| evm.get_state(),
            |_, result| Ok(result::JsGetState::new(result)),
        )
    }

    #[napi]
    pub fn get_block_header_data<'env>(
        &self,
        env: &'env Env,
        block_number: BigInt,
    ) -> Result<PromiseRaw<'env, Option<JsBlockHeaderData>>> {
        let block_number = utils::convert_bigint_to_u64(block_number, "blockNumber")?;

        self.read(
            env,
            move |evm| evm.get_block_header_data(block_number),
            |_, result| {
                Ok(match result {
                    Some(data) => Some(JsBlockHeaderData::new(data)),
                    None => None,
                })
            },
        )
    }

    #[napi]
    pub fn get_block_number_by_hash<'env>(
        &self,
        env: &'env Env,
        block_hash: String,
    ) -> Result<PromiseRaw<'env, Option<BigInt>>> {
        let block_hash = utils::convert_string_to_b256(block_hash)?;

        self.read(
            env,
            move |evm| evm.get_block_number_by_hash(block_hash),
            |_, result| {
                Ok(match result {
                    Some(result) => Some(BigInt::from(result)),
                    None => None,
                })
            },
        )
    }

    #[napi]
    pub fn get_commit_data<'env>(
        &self,
        env: &'env Env,
        block_number: BigInt,
    ) -> Result<PromiseRaw<'env, Option<JsCommitData>>> {
        let block_number = utils::convert_bigint_to_u64(block_number, "blockNumber")?;

        self.read(
            env,
            move |evm| evm.get_commit_data(block_number),
            |_, result| {
                Ok(match result {
                    Some((proof, header, txs)) => Some(JsCommitData::new(proof, header, txs)),
                    None => None,
                })
            },
        )
    }

    #[napi]
    pub fn get_commits_by_block_range<'env>(
        &self,
        env: &'env Env,
        from_block_number: BigInt,
        to_block_number: BigInt,
        max_bytes: BigInt,
    ) -> Result<PromiseRaw<'env, Vec<JsCommitData>>> {
        let from_block_number = utils::convert_bigint_to_u64(from_block_number, "fromBlockNumber")?;
        let to_block_number = utils::convert_bigint_to_u64(to_block_number, "toBlockNumber")?;
        let max_bytes = utils::convert_bigint_to_u64(max_bytes, "maxBytes")?;

        self.read(
            env,
            move |evm| {
                evm.get_commits_by_block_range(from_block_number, to_block_number, max_bytes)
            },
            |_, result| {
                Ok(result
                    .into_iter()
                    .map(|(proof, header, txs)| JsCommitData::new(proof, header, txs))
                    .collect())
            },
        )
    }

    #[napi]
    pub fn get_transaction_data<'env>(
        &self,
        env: &'env Env,
        key: String,
    ) -> Result<PromiseRaw<'env, Option<JsTransactionData>>> {
        self.read(
            env,
            move |evm| evm.get_transaction_data(key),
            |_, result| Ok(result.map(|data| JsTransactionData::new(data))),
        )
    }

    #[napi]
    pub fn get_transaction_key_by_hash<'env>(
        &self,
        env: &'env Env,
        tx_hash: String,
    ) -> Result<PromiseRaw<'env, Option<String>>> {
        let tx_hash = utils::convert_string_to_b256(tx_hash)?;

        self.read(
            env,
            move |evm| evm.get_transaction_key_by_hash(tx_hash),
            |_, result| Ok(result),
        )
    }

    #[napi]
    pub fn snapshot<'env>(
        &mut self,
        env: &'env Env,
        commit_key: JsCommitKey,
    ) -> Result<PromiseRaw<'env, ()>> {
        let commit_key = CommitKey::try_from(commit_key)?;

        self.write(env, move |evm| evm.snapshot(commit_key), |_, _| Ok(()))
    }

    #[napi]
    pub fn rollback<'env>(
        &mut self,
        env: &'env Env,
        commit_key: JsCommitKey,
    ) -> Result<PromiseRaw<'env, ()>> {
        let commit_key = CommitKey::try_from(commit_key)?;

        self.write(env, move |evm| evm.rollback(commit_key), |_, _| Ok(()))
    }

    #[napi]
    pub fn dispose<'env>(&mut self, env: &'env Env) -> Result<PromiseRaw<'env, ()>> {
        self.write(env, move |evm| evm.dispose(), |_, _| Ok(()))
    }
}

impl JsEvmWrapper {
    fn read<'env, F, R, E, C, V>(&self, env: &'env Env, f: F, cb: C) -> Result<PromiseRaw<'env, V>>
    where
        F: FnOnce(&EvmInner) -> std::result::Result<R, E> + Send + 'static,
        R: Send + 'static,
        E: std::fmt::Display + Send + 'static,
        V: ToNapiValue,
        C: FnOnce(&'env Env, R) -> Result<V> + 'static,
    {
        env.spawn_future_with_callback(
            Self::with_read(self.evm.clone(), self.concurrency.clone(), f),
            cb,
        )
    }

    fn write<'env, F, R, E, C, V>(&self, env: &'env Env, f: F, cb: C) -> Result<PromiseRaw<'env, V>>
    where
        F: FnOnce(&mut EvmInner) -> std::result::Result<R, E> + Send + 'static,
        R: Send + 'static,
        E: std::fmt::Display + Send + 'static,
        V: ToNapiValue,
        C: FnOnce(&'env Env, R) -> Result<V> + 'static,
    {
        env.spawn_future_with_callback(
            Self::with_write(self.evm.clone(), self.concurrency.clone(), f),
            cb,
        )
    }

    /// Run `f` against a shared (read) view of the EVM on the blocking pool.
    /// Concurrent readers proceed in parallel; only an in-flight writer blocks them.
    async fn with_read<F, R, E>(
        evm: Arc<parking_lot::RwLock<EvmInner>>,
        concurrency: Option<Arc<Semaphore>>,
        f: F,
    ) -> Result<R>
    where
        F: FnOnce(&EvmInner) -> std::result::Result<R, E> + Send + 'static,
        R: Send + 'static,
        E: std::fmt::Display + Send + 'static,
    {
        // Bounded instances wait here — off the blocking pool — when at capacity.
        let _permit = match concurrency {
            Some(sem) => Some(
                sem.acquire_owned()
                    .await
                    .map_err(|_| napi::Error::from_reason("evm concurrency limiter closed"))?,
            ),
            None => None,
        };

        tokio::task::spawn_blocking(move || {
            let evm = evm.read(); // shared lock; dropped at closure end
            f(&evm)
        })
        .await
        .map_err(|e| napi::Error::from_reason(format!("evm read task failed: {e}")))? // JoinError (panic/cancel)
        .map_err(|e| napi::Error::from_reason(e.to_string())) // inner EVM error
    }

    /// Run `f` against an exclusive (write) view of the EVM on the blocking pool.
    async fn with_write<F, R, E>(
        evm: Arc<parking_lot::RwLock<EvmInner>>,
        concurrency: Option<Arc<Semaphore>>,
        f: F,
    ) -> Result<R>
    where
        F: FnOnce(&mut EvmInner) -> std::result::Result<R, E> + Send + 'static,
        R: Send + 'static,
        E: std::fmt::Display + Send + 'static,
    {
        // Bounded instances wait here — off the blocking pool — when at capacity.
        let _permit = match concurrency {
            Some(sem) => Some(
                sem.acquire_owned()
                    .await
                    .map_err(|_| napi::Error::from_reason("evm concurrency limiter closed"))?,
            ),
            None => None,
        };

        tokio::task::spawn_blocking(move || {
            let mut evm = evm.write(); // exclusive lock
            f(&mut evm)
        })
        .await
        .map_err(|e| napi::Error::from_reason(format!("evm write task failed: {e}")))?
        .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
}
