use std::{collections::HashMap, sync::Arc, u64};

use ctx::{
    BlockContext, CalculateActiveValidatorsContext, EvmOptions, ExecutionContext, GenesisContext,
    JsCalculateActiveValidatorsContext, JsCommitData, JsCommitKey, JsEvmOptions, JsGenesisContext,
    JsPrepareNextCommitContext, JsPreverifyTransactionContext, JsTransactionContext,
    JsTransactionViewContext, JsUpdateRewardsAndVotesContext, PrepareNextCommitContext,
    PreverifyTxContext, TxContext, TxViewContext, UpdateRewardsAndVotesContext,
};
use logger::JsLogger;
use mainsail_evm_core::{
    account::AccountInfoExtended,
    db::{CommitData, CommitKey, GenesisInfo, PendingCommit, PersistentDB, PersistentDBOptions},
    legacy::{LegacyAddress, LegacyColdWallet},
    logger::LogLevel,
    logs_bloom,
    receipt::{TxReceipt, map_execution_result},
    state_changes::AccountUpdate,
    state_commit, state_hash,
};
use napi::{JsBigInt, JsObject, JsString, bindgen_prelude::*};
use napi_derive::napi;
use result::{
    CommitResult, JsAccountInfoExtended, JsLegacyColdWallet, PreverifyTxResult, TxViewResult,
};
use revm::{
    Database, DatabaseCommit, ExecuteEvm, MainBuilder, MainContext,
    context::{
        BlockEnv, Cfg, ContextTr, TxEnv,
        result::{EVMError, ExecutionResult, ResultAndState},
    },
    database::{State, TransitionAccount, WrapDatabaseRef},
    handler::EvmTr,
    primitives::{Address, B256, Bytes, TxKind, U256, hex::ToHexExt},
    state::{AccountInfo, Bytecode},
};

mod ctx;
mod logger;
mod result;
mod utils;

// A complex struct which cannot be exposed to JavaScript directly.
pub struct EvmInner {
    persistent_db: PersistentDB,

    // A pending commit consists of one or more transactions.
    pending_commit: Option<PendingCommit>,

    logger: JsLogger,
}

// NOTE: we guarantee that this can be sent between threads, since it only is accessed through a mutex
unsafe impl Send for EvmInner {}

impl EvmInner {
    pub fn new(opts: EvmOptions) -> Self {
        let logger = JsLogger::new(opts.logger_callback).expect("logger ok");

        let mut db_opts = PersistentDBOptions::new(opts.path).with_logger(logger.inner());

        if let Some(history_size) = opts.history_size {
            if history_size > 0 {
                db_opts = db_opts.with_history_size(history_size)
            }
        }

        let persistent_db = PersistentDB::new(db_opts).expect("path ok");

        EvmInner {
            persistent_db,
            pending_commit: Default::default(),
            logger,
        }
    }

    pub fn prepare_next_commit(&mut self, ctx: PrepareNextCommitContext) -> Result<()> {
        let genesis_height = self.genesis_height();
        if let Some(pending) = self.pending_commit.as_ref() {
            // do not replace any pending commit, while still in bootstrapping phase.
            if pending.key == CommitKey(genesis_height, 0) && ctx.commit_key == pending.key {
                return Ok(());
            }

            self.logger.log(
                LogLevel::Debug,
                format!(
                    "discarding existing pending commit {:?} for {:?}",
                    pending.key, ctx.commit_key
                ),
            );
        }

        self.pending_commit.replace(PendingCommit {
            key: ctx.commit_key,
            ..Default::default()
        });

        Ok(())
    }

    pub fn view(&mut self, tx_ctx: TxViewContext) -> Result<TxViewResult> {
        let result = self.transact_evm(tx_ctx.into());

        Ok(match result {
            Ok(r) => {
                if !r.is_success() {
                    self.logger
                        .log(LogLevel::Warning, format!("view call failed: {:?}", r));
                }

                TxViewResult {
                    success: r.is_success(),
                    output: r.into_output(),
                }
            }
            Err(err) => {
                self.logger.log(
                    LogLevel::Warning,
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
        &mut self,
        address: Address,
        height: Option<u64>,
    ) -> std::result::Result<Bytes, EVMError<String>> {
        let account = match height {
            None => self.persistent_db.basic(address),
            Some(height) => self
                .persistent_db
                .get_historical_account_info(height, address),
        }
        .map_err(|err| EVMError::Database(format!("account lookup failed: {}", err).into()))?;

        match account {
            Some(account) => {
                let code = self
                    .persistent_db
                    .code_by_hash(account.code_hash)
                    .map_err(|err| {
                        EVMError::Database(format!("code lookup failed: {}", err).into())
                    })?;

                Ok(match code {
                    Bytecode::LegacyAnalyzed(code) => code.original_bytes(),
                    Bytecode::Eof(code) => code.raw.clone(),
                    Bytecode::Eip7702(code) => code.raw.clone(),
                })
            }
            None => Ok(Default::default()),
        }
    }

    pub fn storage_at(
        &mut self,
        address: Address,
        slot: U256,
    ) -> std::result::Result<U256, EVMError<String>> {
        match self.persistent_db.storage(address, slot) {
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
        self.persistent_db.set_genesis_info(GenesisInfo {
            account: genesis_ctx.account,
            deployer_account: genesis_ctx.deployer_account,
            validator_contract: genesis_ctx.validator_contract,
            username_contract: genesis_ctx.username_contract,
            initial_height: genesis_ctx.initial_height,
            initial_supply: genesis_ctx.initial_supply,
        });

        Ok(())
    }

    pub fn calculate_active_validators(
        &mut self,
        ctx: CalculateActiveValidatorsContext,
    ) -> std::result::Result<(), EVMError<String>> {
        assert!(
            self.pending_commit
                .as_ref()
                .is_some_and(|c| c.key == ctx.commit_key),
            "calculate_active_validators pending commit key mismatch {:?} - {:?}",
            self.pending_commit.as_ref().map(|c| c.key),
            ctx.commit_key
        );

        let genesis_info = self
            .persistent_db
            .genesis_info
            .as_ref()
            .expect("genesis info")
            .clone();

        let abi = ethers_contract::BaseContract::from(
            ethers_core::abi::parse_abi(&["function calculateActiveValidators(uint8 n) external"])
                .expect("encode abi"),
        );

        // encode abi into Bytes
        let calldata = abi
            .encode("calculateActiveValidators", ctx.active_validators)
            .expect("encode calculateActiveValidators");

        let nonce = self
            .get_account_nonce(genesis_info.deployer_account)
            .map_err(|err| EVMError::Database(format!("get_account_nonce: {err}").into()))?;

        match self.transact_evm(ExecutionContext {
            block_context: Some(BlockContext {
                commit_key: ctx.commit_key,
                gas_limit: u64::MAX,
                timestamp: ctx.timestamp,
                validator_address: ctx.validator_address,
            }),
            caller: genesis_info.deployer_account,
            recipient: Some(genesis_info.validator_contract),
            data: Bytes::from(calldata.0),
            value: U256::ZERO,
            nonce: Some(nonce),
            gas_limit: Some(u64::MAX),
            gas_price: 0,
            spec_id: ctx.spec_id,
            tx_hash: None,
        }) {
            Ok(receipt) => {
                self.logger.log(
                    LogLevel::Info,
                    format!(
                        "calculate_active_validators {:?} {:?}",
                        ctx.commit_key, receipt
                    ),
                );

                assert!(
                    receipt.is_success(),
                    "calculate_active_validators unsuccessful"
                );
                Ok(())
            }
            Err(err) => Err(EVMError::Database(
                format!("calculate_active_validators failed: {}", err).into(),
            )),
        }
    }

    pub fn update_rewards_and_votes(
        &mut self,
        ctx: UpdateRewardsAndVotesContext,
    ) -> std::result::Result<(), EVMError<String>> {
        assert!(
            self.pending_commit
                .as_ref()
                .is_some_and(|c| c.key == ctx.commit_key),
            "update_rewards_and_votes pending commit key mismatch {:?} - {:?}",
            self.pending_commit.as_ref().map(|c| c.key),
            ctx.commit_key
        );

        let mut pending_commit = self.pending_commit.as_mut().expect("ok");

        let genesis_info = self
            .persistent_db
            .genesis_info
            .as_ref()
            .expect("genesis info")
            .clone();

        let mut rewards = HashMap::<Address, u128>::new();
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

                let nonce = self
                    .get_account_nonce(genesis_info.deployer_account)
                    .map_err(|err| {
                        EVMError::Database(format!("get_account_nonce: {err}").into())
                    })?;

                match self.transact_evm(ExecutionContext {
                    block_context: Some(BlockContext {
                        commit_key: ctx.commit_key,
                        gas_limit: u64::MAX,
                        timestamp: ctx.timestamp,
                        validator_address: ctx.validator_address,
                    }),
                    caller: genesis_info.deployer_account,
                    recipient: Some(genesis_info.validator_contract),
                    data: Bytes::from(calldata.0),
                    value: U256::ZERO,
                    nonce: Some(nonce),
                    gas_limit: Some(u64::MAX),
                    gas_price: 0,
                    spec_id: ctx.spec_id,
                    tx_hash: None,
                }) {
                    Ok(receipt) => {
                        self.logger.log(
                            LogLevel::Info,
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
        &mut self,
        address: Address,
        height: Option<u64>,
    ) -> std::result::Result<AccountInfo, EVMError<String>> {
        let result = match height {
            None => self.persistent_db.basic(address),
            Some(height) => self
                .persistent_db
                .get_historical_account_info(height, address),
        };

        match result {
            Ok(account) => Ok(account.unwrap_or_default()),
            Err(err) => Err(EVMError::Database(
                format!("account lookup failed: {}", err).into(),
            )),
        }
    }

    pub fn get_account_info_extended(
        &mut self,
        address: Address,
        legacy_address: Option<LegacyAddress>,
    ) -> std::result::Result<AccountInfoExtended, EVMError<String>> {
        let mut info = self
            .persistent_db
            .basic(address)
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

    pub fn import_account_info(
        &mut self,
        info: AccountInfoExtended,
    ) -> std::result::Result<(), EVMError<String>> {
        let genesis_height = self.genesis_height();

        let pending = self.pending_commit.as_mut().unwrap();
        assert_eq!(pending.key, CommitKey(genesis_height, 0));
        assert!(!pending.cache.accounts.contains_key(&info.address));

        let (address, info, legacy_attributes) = info.into_parts();
        pending.import_account(address, info, legacy_attributes);

        Ok(())
    }

    pub fn import_legacy_cold_wallet(
        &mut self,
        wallet: LegacyColdWallet,
    ) -> std::result::Result<(), EVMError<String>> {
        let genesis_height = self.genesis_height();

        let pending = self.pending_commit.as_mut().unwrap();
        assert_eq!(pending.key, CommitKey(genesis_height, 0));

        assert!(!pending.legacy_cold_wallets.contains_key(&wallet.address));
        pending.legacy_cold_wallets.insert(wallet.address, wallet);

        Ok(())
    }

    pub fn get_accounts(
        &mut self,
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

    pub fn get_legacy_cold_wallets(
        &mut self,
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
        &mut self,
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

    pub fn preverify_transaction(
        &mut self,
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
                    let mut legacy_balances = HashMap::<Address, u128>::new();
                    legacy_balances.insert(
                        ctx.caller,
                        legacy_cold_wallet.balance.try_into().expect("fit u128"),
                    );
                    state_commit::apply_rewards(
                        &mut self.persistent_db,
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

        let state_db = State::builder()
            .with_bundle_update()
            .with_cached_prestate(std::mem::take(&mut pending_commit.cache))
            .with_database(WrapDatabaseRef(&self.persistent_db))
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
                tx_env.caller = ctx.caller;
                tx_env.value = ctx.value;
                tx_env.nonce = ctx.nonce;
                tx_env.kind = match ctx.recipient {
                    Some(recipient) => TxKind::Call(recipient),
                    None => TxKind::Create,
                };

                tx_env.data = ctx.data;
            })
            .build_mainnet();

        let ctx = evm.ctx_ref();
        let result =
            revm::handler::validation::validate_initial_tx_gas(ctx.tx(), ctx.cfg().spec().into());

        Ok(match result {
            Ok(result) => PreverifyTxResult {
                success: true,
                initial_gas_used: result.initial_gas,
                ..Default::default()
            },
            Err(err) => PreverifyTxResult {
                error: Some(format!("preverify failed: {}", err.to_string())),
                ..Default::default()
            },
        })
    }

    pub fn get_receipt(
        &mut self,
        height: u64,
        tx_hash: B256,
    ) -> std::result::Result<Option<TxReceipt>, EVMError<String>> {
        match self.persistent_db.get_receipt(height, tx_hash) {
            Ok(receipt) => Ok(receipt),
            Err(err) => Err(EVMError::Database(
                format!("failed reading receipt: {}", err).into(),
            )),
        }
    }

    pub fn process(
        &mut self,
        tx_ctx: TxContext,
    ) -> std::result::Result<TxReceipt, EVMError<String>> {
        let commit_key = tx_ctx.block_context.commit_key;

        let (committed, _) = self
            .persistent_db
            .get_committed_receipt(commit_key.0, tx_ctx.tx_hash)
            .map_err(|err| EVMError::Database(format!("commit receipt lookup: {}", err).into()))?;
        assert!(!committed);

        if let Some(mut pending) = self.pending_commit.as_mut() {
            assert!(pending.key == commit_key, "pending commit key mismatch");

            // Make legacy cold wallet balance available to pending commit if not already present
            if let Some(legacy_address) = tx_ctx.legacy_address {
                if !pending
                    .merged_legacy_cold_wallets
                    .contains_key(&tx_ctx.caller)
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
                            let mut legacy_balances = HashMap::<Address, u128>::new();
                            legacy_balances.insert(
                                tx_ctx.caller,
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
                                .insert(tx_ctx.caller, Some((tx_ctx.tx_hash, legacy_address)));
                        }
                        _ => {
                            // Prevent subsequent look ups for same sender in same commit
                            pending
                                .merged_legacy_cold_wallets
                                .insert(tx_ctx.caller, None);
                        }
                    }
                }
            }
        }

        let result = self.transact_evm(tx_ctx.into());

        match result {
            Ok(result) => {
                let receipt = map_execution_result(result);
                Ok(receipt)
            }
            Err(err) => {
                match err {
                    EVMError::Transaction(err) => {
                        match err {
                            revm::context::result::InvalidTransaction::CallGasCostMoreThanGasLimit {.. }
                            | revm::context::result::InvalidTransaction::NonceTooHigh { .. }
                            | revm::context::result::InvalidTransaction::NonceTooLow { .. }
                            | revm::context::result::InvalidTransaction::LackOfFundForMaxFee {
                                ..
                            } => {
                                return Err(EVMError::Transaction(err));
                            }
                            // revm::context::result::InvalidTransaction::PriorityFeeGreaterThanMaxFee => todo!(),
                            // revm::context::result::InvalidTransaction::GasPriceLessThanBasefee => todo!(),
                            // revm::context::result::InvalidTransaction::CallerGasLimitMoreThanBlock => todo!(),
                            // revm::context::result::InvalidTransaction::RejectCallerWithCode => todo!(),
                            // revm::context::result::InvalidTransaction::OverflowPaymentInTransaction => todo!(),
                            // revm::context::result::InvalidTransaction::NonceOverflowInTransaction => todo!(),
                            // revm::context::result::InvalidTransaction::CreateInitCodeSizeLimit => todo!(),
                            // revm::context::result::InvalidTransaction::InvalidChainId => todo!(),
                            // revm::context::result::InvalidTransaction::AccessListNotSupported => todo!(),
                            // revm::context::result::InvalidTransaction::MaxFeePerBlobGasNotSupported => todo!(),
                            // revm::context::result::InvalidTransaction::BlobVersionedHashesNotSupported => todo!(),
                            // revm::context::result::InvalidTransaction::BlobGasPriceGreaterThanMax => todo!(),
                            // revm::context::result::InvalidTransaction::EmptyBlobs => todo!(),
                            // revm::context::result::InvalidTransaction::BlobCreateTransaction => todo!(),
                            // revm::context::result::InvalidTransaction::TooManyBlobs { max, have } => todo!(),
                            // revm::context::result::InvalidTransaction::BlobVersionNotSupported => todo!(),
                            // revm::context::result::InvalidTransaction::EofInitcodesNotSupported => todo!(),
                            // revm::context::result::InvalidTransaction::EofInitcodesNumberLimit => todo!(),
                            // revm::context::result::InvalidTransaction::EofInitcodesSizeLimit => todo!(),
                            // revm::context::result::InvalidTransaction::EofCrateShouldHaveToAddress => todo!(),
                            _ => {
                                todo!("unhandled tx err {:?}", err);
                            }
                        }
                    }
                    // EVMError::Header(_) => todo!(),
                    // EVMError::Database(_) => todo!(),
                    // EVMError::Custom(_) => todo!(),
                    _ => {
                        todo!("unhandled evm err {:?}", err);
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
        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != commit_key)
        {
            return Err(EVMError::Database(
                format!(
                    "invalid commit key: {:#?} - {:#?}",
                    self.pending_commit.as_ref().map(|c| c.key),
                    commit_key
                )
                .into(),
            ));
        }

        let outcome = match self.take_pending_commit() {
            Some(pending_commit) => {
                // self.logger.log(
                //     LogLevel::Info,
                //     format!(
                //         "committing {:?} with {} transitions",
                //         commit_key,
                //         pending_commit.transitions.transitions.len(),
                //     ),
                // );

                state_commit::commit_to_db(&mut self.persistent_db, pending_commit, commit_data)
            }
            None => Ok(Default::default()),
        };

        match outcome {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(format!("commit failed: {}", err).into())),
        }
    }

    pub fn state_hash(
        &mut self,
        commit_key: CommitKey,
        current_hash: B256,
    ) -> std::result::Result<String, EVMError<String>> {
        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != commit_key)
        {
            self.drop_pending_commit();
        }

        let pending_commit = self
            .pending_commit
            .get_or_insert_with(|| PendingCommit {
                key: commit_key,
                ..Default::default()
            })
            .clone();

        let result = state_hash::calculate(&mut self.persistent_db, pending_commit, current_hash);

        match result {
            Ok(result) => Ok(result.encode_hex()),
            Err(err) => Err(EVMError::Database(
                format!("state_hash failed: {}", err).into(),
            )),
        }
    }

    pub fn logs_bloom(
        &mut self,
        commit_key: CommitKey,
    ) -> std::result::Result<String, EVMError<String>> {
        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != commit_key)
        {
            self.drop_pending_commit();
        }

        let pending_commit = self
            .pending_commit
            .get_or_insert_with(|| PendingCommit {
                key: commit_key,
                ..Default::default()
            })
            .clone();

        let result = logs_bloom::calculate(&pending_commit);

        match result {
            Ok(result) => Ok(result.encode_hex()),
            Err(err) => Err(EVMError::Database(
                format!("logs_bloom failed: {}", err).into(),
            )),
        }
    }

    pub fn is_empty(&mut self) -> std::result::Result<bool, EVMError<String>> {
        let result = self.persistent_db.is_empty();

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("is_empty failed: {}", err).into(),
            )),
        }
    }

    pub fn get_state(&mut self) -> std::result::Result<(u64, u64), EVMError<String>> {
        let result = self.persistent_db.get_state();

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_state failed: {}", err).into(),
            )),
        }
    }

    pub fn get_block_header_bytes(
        &mut self,
        height: u64,
    ) -> std::result::Result<Option<Bytes>, EVMError<String>> {
        let result = self.persistent_db.get_block_header_bytes(height);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_block_header_bytes failed: {}", err).into(),
            )),
        }
    }

    pub fn get_block_height_by_id(
        &mut self,
        id: B256,
    ) -> std::result::Result<Option<u64>, EVMError<String>> {
        let result = self.persistent_db.get_block_height_by_id(id);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_block_height_by_id failed: {}", err).into(),
            )),
        }
    }

    pub fn get_proof_bytes(
        &mut self,
        height: u64,
    ) -> std::result::Result<Option<Bytes>, EVMError<String>> {
        let result = self.persistent_db.get_proof_bytes(height);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_proof_bytes failed: {}", err).into(),
            )),
        }
    }

    pub fn get_transaction_bytes(
        &mut self,
        key: String,
    ) -> std::result::Result<Option<Bytes>, EVMError<String>> {
        let result = self.persistent_db.get_transaction_bytes(key);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_transaction_bytes failed: {}", err).into(),
            )),
        }
    }

    pub fn get_transaction_key_by_id(
        &mut self,
        id: B256,
    ) -> std::result::Result<Option<String>, EVMError<String>> {
        let result = self.persistent_db.get_transaction_key_by_id(id);

        match result {
            Ok(result) => Ok(result),
            Err(err) => Err(EVMError::Database(
                format!("get_transaction_key_by_id failed: {}", err).into(),
            )),
        }
    }

    pub fn dispose(&mut self) -> std::result::Result<(), EVMError<String>> {
        // replace to drop any reference to logging hook
        self.logger = JsLogger::new(None)
            .map_err(|err| EVMError::Custom(format!("close logger err={err}")))?;

        Ok(())
    }

    fn transact_evm(
        &mut self,
        ctx: ExecutionContext,
    ) -> std::result::Result<ExecutionResult, EVMError<mainsail_evm_core::db::Error>> {
        let mut state_builder = State::builder().with_bundle_update();

        if let Some(commit_key) = ctx.block_context.as_ref().map(|b| b.commit_key) {
            let pending_commit = self
                .pending_commit
                .get_or_insert_with(|| PendingCommit::new(commit_key));

            state_builder =
                state_builder.with_cached_prestate(std::mem::take(&mut pending_commit.cache));
        }

        let state_db = state_builder
            .with_database(WrapDatabaseRef(&self.persistent_db))
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

                block_env.number = block_ctx.commit_key.0;
                block_env.beneficiary = block_ctx.validator_address;
                block_env.timestamp = block_ctx.timestamp;
                block_env.gas_limit = block_ctx.gas_limit;
                block_env.difficulty = U256::ZERO;
            })
            .modify_tx_chained(|tx_env: &mut TxEnv| {
                tx_env.gas_limit = ctx.gas_limit.unwrap_or_else(|| 15_000_000);
                tx_env.gas_price = ctx.gas_price;
                tx_env.gas_priority_fee = None;
                tx_env.caller = ctx.caller;
                tx_env.value = ctx.value;
                tx_env.nonce = ctx.nonce.unwrap_or_default();
                tx_env.kind = match ctx.recipient {
                    Some(recipient) => TxKind::Call(recipient),
                    None => TxKind::Create,
                };

                tx_env.data = ctx.data;
            })
            .build_mainnet();

        let result = evm.replay();

        match result {
            Ok(result) => {
                let ResultAndState { state, result } = result;

                // Update state if transaction is part of a commit
                if let Some(commit_key) = ctx.block_context.as_ref().map(|b| b.commit_key) {
                    if let Some(pending_commit) = &mut self.pending_commit {
                        assert_eq!(commit_key, pending_commit.key);

                        let state_db = evm.db();

                        state_db.commit(state);

                        pending_commit.cache = std::mem::take(&mut state_db.cache);

                        if let Some(tx_hash) = ctx.tx_hash {
                            pending_commit.results.insert(tx_hash, result.clone());
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

                Ok(result)
            }
            Err(err) => Err(err),
        }
    }

    fn get_account_nonce(
        &mut self,
        account: Address,
    ) -> std::result::Result<u64, mainsail_evm_core::db::Error> {
        if let Some(pending) = &self.pending_commit {
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

    fn take_pending_commit(&mut self) -> Option<PendingCommit> {
        self.pending_commit.take()
    }

    fn drop_pending_commit(&mut self) {
        self.take_pending_commit();
    }

    #[inline]
    fn genesis_height(&mut self) -> u64 {
        self.persistent_db
            .genesis_info
            .as_ref()
            .cloned()
            .unwrap_or_default()
            .initial_height
    }
}

// The EVM wrapper is exposed to JavaScript.

#[napi(js_name = "Evm")]
pub struct JsEvmWrapper {
    evm: Arc<tokio::sync::Mutex<EvmInner>>,
}

#[napi]
impl JsEvmWrapper {
    #[napi(constructor)]
    pub fn new(opts: JsEvmOptions) -> Result<Self> {
        let opts = EvmOptions::try_from(opts)?;
        Ok(JsEvmWrapper {
            evm: Arc::new(tokio::sync::Mutex::new(EvmInner::new(opts))),
        })
    }

    #[napi(ts_return_type = "Promise<JsPreverifyTransactionResult>")]
    pub fn preverify_transaction(
        &mut self,
        node_env: Env,
        tx_ctx: JsPreverifyTransactionContext,
    ) -> Result<JsObject> {
        let tx_ctx = PreverifyTxContext::try_from(tx_ctx)?;
        node_env.execute_tokio_future(
            Self::preverify_transaction_async(self.evm.clone(), tx_ctx),
            |&mut node_env, result| {
                Ok(result::JsPreverifyTransactionResult::new(
                    &node_env, result,
                )?)
            },
        )
    }

    #[napi(ts_return_type = "Promise<JsViewResult>")]
    pub fn view(&mut self, node_env: Env, view_ctx: JsTransactionViewContext) -> Result<JsObject> {
        let view_ctx = TxViewContext::try_from(view_ctx)?;
        node_env.execute_tokio_future(
            Self::view_async(self.evm.clone(), view_ctx),
            |&mut node_env, result| Ok(result::JsViewResult::new(&node_env, result)?),
        )
    }

    #[napi(ts_return_type = "Promise<JsProcessResult>")]
    pub fn process(&mut self, node_env: Env, tx_ctx: JsTransactionContext) -> Result<JsObject> {
        let tx_ctx = TxContext::try_from(tx_ctx)?;
        node_env.execute_tokio_future(
            Self::process_async(self.evm.clone(), tx_ctx),
            |&mut node_env, result| Ok(result::JsProcessResult::new(&node_env, result)?),
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn initialize_genesis(
        &mut self,
        node_env: Env,
        genesis_ctx: JsGenesisContext,
    ) -> Result<JsObject> {
        let genesis_ctx = GenesisContext::try_from(genesis_ctx)?;
        node_env.execute_tokio_future(
            Self::initialize_genesis_async(self.evm.clone(), genesis_ctx),
            |_, _| Ok(()),
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn prepare_next_commit(
        &mut self,
        node_env: Env,
        ctx: JsPrepareNextCommitContext,
    ) -> Result<JsObject> {
        let ctx = PrepareNextCommitContext::try_from(ctx)?;
        node_env.execute_tokio_future(
            Self::prepare_next_commit_async(self.evm.clone(), ctx),
            |_, _| Ok(()),
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn calculate_active_validators(
        &mut self,
        node_env: Env,
        ctx: JsCalculateActiveValidatorsContext,
    ) -> Result<JsObject> {
        let ctx = CalculateActiveValidatorsContext::try_from(ctx)?;
        node_env.execute_tokio_future(
            Self::calculate_active_validators_async(self.evm.clone(), ctx),
            |_, _| Ok(()),
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn update_rewards_and_votes(
        &mut self,
        node_env: Env,
        ctx: JsUpdateRewardsAndVotesContext,
    ) -> Result<JsObject> {
        let ctx = UpdateRewardsAndVotesContext::try_from(ctx)?;
        node_env.execute_tokio_future(
            Self::update_rewards_and_votes_async(self.evm.clone(), ctx),
            |_, _| Ok(()),
        )
    }

    #[napi(ts_return_type = "Promise<JsAccountInfo>")]
    pub fn get_account_info(
        &mut self,
        node_env: Env,
        address: JsString,
        height: Option<JsBigInt>,
    ) -> Result<JsObject> {
        let address = utils::create_address_from_js_string(address)?;

        let height = match height {
            Some(height) => Some(height.get_u64()?.0),
            None => None,
        };

        node_env.execute_tokio_future(
            Self::get_account_info_async(self.evm.clone(), address, height),
            |&mut node_env, result| Ok(result::JsAccountInfo::new(&node_env, result)?),
        )
    }

    #[napi(ts_return_type = "Promise<JsAccountInfoExtended>")]
    pub fn get_account_info_extended(
        &mut self,
        node_env: Env,
        address: JsString,
        legacy_address: Option<JsString>,
    ) -> Result<JsObject> {
        let address = utils::create_address_from_js_string(address)?;
        let legacy_address = if let Some(legacy_address) = legacy_address {
            Some(utils::create_legacy_address_from_js_string(legacy_address)?)
        } else {
            None
        };

        node_env.execute_tokio_future(
            Self::get_account_info_extended_async(self.evm.clone(), address, legacy_address),
            |&mut node_env, result| Ok(result::JsAccountInfoExtended::new(&node_env, result)?),
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn import_account_info(
        &mut self,
        node_env: Env,
        info: JsAccountInfoExtended,
    ) -> Result<JsObject> {
        let info: AccountInfoExtended = info.try_into()?;

        node_env.execute_tokio_future(
            Self::import_account_info_async(self.evm.clone(), info),
            |_, _| Ok(()),
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn import_legacy_cold_wallet(
        &mut self,
        node_env: Env,
        info: JsLegacyColdWallet,
    ) -> Result<JsObject> {
        let info: LegacyColdWallet = info.try_into()?;

        node_env.execute_tokio_future(
            Self::import_legacy_cold_wallet_async(self.evm.clone(), info),
            |_, _| Ok(()),
        )
    }

    #[napi(ts_return_type = "Promise<JsGetAccounts>")]
    pub fn get_accounts(
        &mut self,
        node_env: Env,
        offset: JsBigInt,
        limit: JsBigInt,
    ) -> Result<JsObject> {
        let offset = offset.get_u64()?.0;
        let limit = limit.get_u64()?.0;

        node_env.execute_tokio_future(
            Self::get_accounts_async(self.evm.clone(), offset, limit),
            |&mut node_env, result| Ok(result::JsGetAccounts::new(&node_env, result.0, result.1)?),
        )
    }

    #[napi(ts_return_type = "Promise<JsGetLegacyColdWallets>")]
    pub fn get_legacy_cold_wallets(
        &mut self,
        node_env: Env,
        offset: JsBigInt,
        limit: JsBigInt,
    ) -> Result<JsObject> {
        let offset = offset.get_u64()?.0;
        let limit = limit.get_u64()?.0;

        node_env.execute_tokio_future(
            Self::get_legacy_cold_wallets_async(self.evm.clone(), offset, limit),
            |&mut node_env, result| {
                Ok(result::JsGetLegacyColdWallets::new(
                    &node_env, result.0, result.1,
                )?)
            },
        )
    }

    #[napi(ts_return_type = "Promise<JsGetReceipts>")]
    pub fn get_receipts(
        &mut self,
        node_env: Env,
        offset: JsBigInt,
        limit: JsBigInt,
    ) -> Result<JsObject> {
        let offset = offset.get_u64()?.0;
        let limit = limit.get_u64()?.0;

        node_env.execute_tokio_future(
            Self::get_receipts_async(self.evm.clone(), offset, limit),
            |&mut node_env, result| Ok(result::JsGetReceipts::new(&node_env, result.0, result.1)?),
        )
    }

    #[napi(ts_return_type = "Promise<JsGetReceipt>")]
    pub fn get_receipt(
        &mut self,
        node_env: Env,
        height: JsBigInt,
        tx_hash: JsString,
    ) -> Result<JsObject> {
        let height = height.get_u64()?.0;
        let tx_hash = utils::convert_string_to_b256(tx_hash)?;

        node_env.execute_tokio_future(
            Self::get_receipt_async(self.evm.clone(), height, tx_hash),
            move |&mut node_env, result| {
                Ok(result::JsGetReceipt::new(
                    &node_env, result, height, tx_hash,
                )?)
            },
        )
    }

    #[napi(ts_return_type = "Promise<string>")]
    pub fn code_at(
        &mut self,
        node_env: Env,
        address: JsString,
        height: Option<JsBigInt>,
    ) -> Result<JsObject> {
        let address = utils::create_address_from_js_string(address)?;
        let height = match height {
            Some(height) => Some(height.get_u64()?.0),
            None => None,
        };

        node_env.execute_tokio_future(
            Self::code_at_async(self.evm.clone(), address, height),
            |&mut node_env, result| Ok(node_env.create_string_from_std(result)?),
        )
    }

    #[napi(ts_return_type = "Promise<string>")]
    pub fn storage_at(
        &mut self,
        node_env: Env,
        address: JsString,
        slot: JsBigInt,
    ) -> Result<JsObject> {
        let address = utils::create_address_from_js_string(address)?;
        let slot = utils::convert_bigint_to_u256(slot)?;
        node_env.execute_tokio_future(
            Self::storage_at_async(self.evm.clone(), address, slot),
            |&mut node_env, result| Ok(node_env.create_string_from_std(result)?),
        )
    }

    #[napi(ts_return_type = "Promise<JsCommitResult>")]
    pub fn commit(
        &mut self,
        node_env: Env,
        commit_key: JsCommitKey,
        commit_data: Option<JsCommitData>,
    ) -> Result<JsObject> {
        let commit_key = CommitKey::try_from(commit_key)?;
        let commit_data = if let Some(commit_data) = commit_data {
            Some(CommitData::try_from(commit_data)?)
        } else {
            None
        };

        node_env.execute_tokio_future(
            Self::commit_async(self.evm.clone(), commit_key, commit_data),
            |&mut node_env, result| Ok(result::JsCommitResult::new(&node_env, result)?),
        )
    }

    #[napi(ts_return_type = "Promise<string>")]
    pub fn state_hash(
        &mut self,
        node_env: Env,
        commit_key: JsCommitKey,
        current_hash: JsString,
    ) -> Result<JsObject> {
        let commit_key = CommitKey::try_from(commit_key)?;
        let current_hash = utils::convert_string_to_b256(current_hash)?;
        node_env.execute_tokio_future(
            Self::state_hash_async(self.evm.clone(), commit_key, current_hash),
            |&mut node_env, result| Ok(node_env.create_string_from_std(result)?),
        )
    }

    #[napi(ts_return_type = "Promise<string>")]
    pub fn logs_bloom(&mut self, node_env: Env, commit_key: JsCommitKey) -> Result<JsObject> {
        let commit_key = CommitKey::try_from(commit_key)?;
        node_env.execute_tokio_future(
            Self::logs_bloom_async(self.evm.clone(), commit_key),
            |&mut node_env, result| Ok(node_env.create_string_from_std(result)?),
        )
    }

    #[napi(ts_return_type = "Promise<boolean>")]
    pub fn is_empty(&mut self, node_env: Env) -> Result<JsObject> {
        node_env.execute_tokio_future(
            Self::is_empty_async(self.evm.clone()),
            |&mut node_env, result| Ok(node_env.get_boolean(result)?),
        )
    }

    #[napi(ts_return_type = "Promise<JsGetState>")]
    pub fn get_state(&mut self, node_env: Env) -> Result<JsObject> {
        node_env.execute_tokio_future(
            Self::get_state_async(self.evm.clone()),
            |&mut node_env, result| Ok(result::JsGetState::new(&node_env, result)?),
        )
    }

    #[napi(ts_return_type = "Promise<Buffer | undefined>")]
    pub fn get_block_header_bytes(&mut self, node_env: Env, height: JsBigInt) -> Result<JsObject> {
        let height = height.get_u64()?.0;
        node_env.execute_tokio_future(
            Self::get_block_header_bytes_async(self.evm.clone(), height),
            |&mut node_env, result| {
                Ok(match result {
                    Some(bytes) => Some(utils::convert_bytes_to_js_buffer(&node_env, bytes)?),
                    None => None,
                })
            },
        )
    }

    #[napi(ts_return_type = "Promise<bigint | undefined>")]
    pub fn get_block_height_by_id(&mut self, node_env: Env, id: JsString) -> Result<JsObject> {
        let id = utils::convert_string_to_b256(id)?;

        node_env.execute_tokio_future(
            Self::get_block_height_by_id_async(self.evm.clone(), id),
            |&mut node_env, result| {
                Ok(match result {
                    Some(result) => Some(node_env.create_bigint_from_u64(result)?),
                    None => None,
                })
            },
        )
    }

    #[napi(ts_return_type = "Promise<Buffer | undefined>")]
    pub fn get_proof_bytes(&mut self, node_env: Env, height: JsBigInt) -> Result<JsObject> {
        let height = height.get_u64()?.0;
        node_env.execute_tokio_future(
            Self::get_proof_bytes_async(self.evm.clone(), height),
            |&mut node_env, result| {
                Ok(match result {
                    Some(bytes) => Some(utils::convert_bytes_to_js_buffer(&node_env, bytes)?),
                    None => None,
                })
            },
        )
    }

    #[napi(ts_return_type = "Promise<Buffer | undefined>")]
    pub fn get_transaction_bytes(&mut self, node_env: Env, key: JsString) -> Result<JsObject> {
        let key = key.into_utf8()?.into_owned()?;
        node_env.execute_tokio_future(
            Self::get_transaction_bytes_async(self.evm.clone(), key),
            |&mut node_env, result| {
                Ok(match result {
                    Some(bytes) => Some(utils::convert_bytes_to_js_buffer(&node_env, bytes)?),
                    None => None,
                })
            },
        )
    }

    #[napi(ts_return_type = "Promise<string | undefined>")]
    pub fn get_transaction_key_by_id(&mut self, node_env: Env, id: JsString) -> Result<JsObject> {
        let id = utils::convert_string_to_b256(id)?;

        node_env.execute_tokio_future(
            Self::get_transaction_key_by_id_async(self.evm.clone(), id),
            |&mut node_env, result| {
                Ok(match result {
                    Some(result) => Some(node_env.create_string(&result)?),
                    None => None,
                })
            },
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn dispose(&mut self, node_env: Env) -> Result<JsObject> {
        node_env.execute_tokio_future(Self::dispose_async(self.evm.clone()), |_, _| Ok(()))
    }

    async fn preverify_transaction_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        tx_ctx: PreverifyTxContext,
    ) -> Result<PreverifyTxResult> {
        let mut lock = evm.lock().await;
        let result = lock.preverify_transaction(tx_ctx);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn view_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        view_ctx: TxViewContext,
    ) -> Result<TxViewResult> {
        let mut lock = evm.lock().await;
        lock.view(view_ctx)
    }

    async fn process_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        tx_ctx: TxContext,
    ) -> Result<TxReceipt> {
        let mut lock = evm.lock().await;
        let result = lock.process(tx_ctx);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_account_info_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        address: Address,
        height: Option<u64>,
    ) -> Result<AccountInfo> {
        let mut lock = evm.lock().await;
        let result = lock.get_account_info(address, height);

        match result {
            Ok(account) => Result::Ok(account),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_account_info_extended_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        address: Address,
        legacy_address: Option<LegacyAddress>,
    ) -> Result<AccountInfoExtended> {
        let mut lock = evm.lock().await;
        let result = lock.get_account_info_extended(address, legacy_address);

        match result {
            Ok(account) => Result::Ok(account),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn import_account_info_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        info: AccountInfoExtended,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.import_account_info(info);

        match result {
            Ok(_) => Result::Ok(()),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn import_legacy_cold_wallet_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        wallet: LegacyColdWallet,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.import_legacy_cold_wallet(wallet);

        match result {
            Ok(_) => Result::Ok(()),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn initialize_genesis_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        genesis_ctx: GenesisContext,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.initialize_genesis(genesis_ctx);

        match result {
            Ok(_) => Result::Ok(()),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn prepare_next_commit_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        ctx: PrepareNextCommitContext,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.prepare_next_commit(ctx);

        match result {
            Ok(_) => Result::Ok(()),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn calculate_active_validators_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        ctx: CalculateActiveValidatorsContext,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.calculate_active_validators(ctx);

        match result {
            Ok(_) => Result::Ok(()),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn update_rewards_and_votes_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        ctx: UpdateRewardsAndVotesContext,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.update_rewards_and_votes(ctx);

        match result {
            Ok(_) => Result::Ok(()),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn code_at_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        address: Address,
        height: Option<u64>,
    ) -> Result<String> {
        let mut lock = evm.lock().await;
        let result = lock.code_at(address, height);

        match result {
            Ok(code) => Result::Ok(revm::primitives::hex::encode_prefixed(code.as_ref())),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn storage_at_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        address: Address,
        slot: U256,
    ) -> Result<String> {
        let mut lock = evm.lock().await;
        let result = lock.storage_at(address, slot);

        match result {
            Ok(slot) => Result::Ok(revm::primitives::hex::encode_prefixed(
                slot.to_be_bytes::<32>(),
            )),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn commit_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        commit_key: CommitKey,
        commit_data: Option<CommitData>,
    ) -> Result<CommitResult> {
        let mut lock = evm.lock().await;
        let result = lock.commit(commit_key, commit_data);

        match result {
            Ok(result) => Result::Ok(CommitResult {
                dirty_accounts: result,
            }),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn state_hash_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        commit_key: CommitKey,
        current_hash: B256,
    ) -> Result<String> {
        let mut lock = evm.lock().await;
        let result = lock.state_hash(commit_key, current_hash);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn logs_bloom_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        commit_key: CommitKey,
    ) -> Result<String> {
        let mut lock = evm.lock().await;
        let result = lock.logs_bloom(commit_key);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_accounts_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<AccountInfoExtended>)> {
        let mut lock = evm.lock().await;
        let result = lock.get_accounts(offset, limit);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_legacy_cold_wallets_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<LegacyColdWallet>)> {
        let mut lock = evm.lock().await;
        let result = lock.get_legacy_cold_wallets(offset, limit);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_receipts_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        offset: u64,
        limit: u64,
    ) -> Result<(Option<u64>, Vec<(u64, Vec<(B256, TxReceipt)>)>)> {
        let mut lock = evm.lock().await;
        let result = lock.get_receipts(offset, limit);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_receipt_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        height: u64,
        tx_hash: B256,
    ) -> Result<Option<TxReceipt>> {
        let mut lock = evm.lock().await;
        let result = lock.get_receipt(height, tx_hash);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn is_empty_async(evm: Arc<tokio::sync::Mutex<EvmInner>>) -> Result<bool> {
        let mut lock = evm.lock().await;
        let result = lock.is_empty();

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_state_async(evm: Arc<tokio::sync::Mutex<EvmInner>>) -> Result<(u64, u64)> {
        let mut lock = evm.lock().await;
        let result = lock.get_state();

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_block_header_bytes_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        height: u64,
    ) -> Result<Option<Bytes>> {
        let mut lock = evm.lock().await;
        let result = lock.get_block_header_bytes(height);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_block_height_by_id_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        id: B256,
    ) -> Result<Option<u64>> {
        let mut lock = evm.lock().await;
        let result = lock.get_block_height_by_id(id);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_proof_bytes_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        height: u64,
    ) -> Result<Option<Bytes>> {
        let mut lock = evm.lock().await;
        let result = lock.get_proof_bytes(height);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_transaction_bytes_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        key: String,
    ) -> Result<Option<Bytes>> {
        let mut lock = evm.lock().await;
        let result = lock.get_transaction_bytes(key);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn get_transaction_key_by_id_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        id: B256,
    ) -> Result<Option<String>> {
        let mut lock = evm.lock().await;
        let result = lock.get_transaction_key_by_id(id);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn dispose_async(evm: Arc<tokio::sync::Mutex<EvmInner>>) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.dispose();

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }
}
