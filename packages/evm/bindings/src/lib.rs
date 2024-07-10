use std::{path::PathBuf, sync::Arc};

use ctx::{
    AccountUpdateContext, ExecutionContext, JsAccountUpdateContext, JsCommitKey,
    JsTransactionContext, JsTransactionViewContext, TxContext, TxViewContext,
};
use mainsail_evm_core::{
    db::{CommitKey, PendingCommit, PersistentDB},
    state_commit, state_hash,
};
use napi::{bindgen_prelude::*, JsObject, JsString};
use napi_derive::napi;
use result::{TxReceipt, TxViewResult};
use revm::{
    db::{State, WrapDatabaseRef},
    primitives::{
        hex::ToHexExt, AccountInfo, Address, EVMError, ExecutionResult, ResultAndState, B256, U256,
    },
    Database, DatabaseCommit, Evm, TransitionAccount,
};

mod ctx;
mod result;
mod utils;

// A complex struct which cannot be exposed to JavaScript directly.
pub struct EvmInner {
    persistent_db: PersistentDB,

    // A pending commit consists of one or more transactions.
    pending_commit: Option<PendingCommit>,
}

// NOTE: we guarantee that this can be sent between threads, since it only is accessed through a mutex
unsafe impl Send for EvmInner {}

impl EvmInner {
    pub fn new(path: PathBuf) -> Self {
        let persistent_db = PersistentDB::new(path).expect("path ok");

        EvmInner {
            persistent_db,
            pending_commit: Default::default(),
        }
    }

    pub fn view(&mut self, tx_ctx: TxViewContext) -> Result<TxViewResult> {
        let result = self.transact_evm(tx_ctx.into());

        Ok(match result {
            Ok(r) => TxViewResult {
                success: r.is_success(),
                output: r.into_output(),
            },
            Err(_) => TxViewResult {
                success: false,
                output: None,
            },
        })
    }

    pub fn get_account_info(
        &mut self,
        address: Address,
    ) -> std::result::Result<AccountInfo, EVMError<String>> {
        match self.persistent_db.basic(address) {
            Ok(account) => Ok(account.unwrap_or_default()),
            Err(err) => Err(EVMError::Database(
                format!("account lookup failed: {}", err).into(),
            )),
        }
    }

    pub fn update_account_info(
        &mut self,
        account_update_ctx: AccountUpdateContext,
    ) -> std::result::Result<(), EVMError<String>> {
        if self
            .persistent_db
            .is_height_committed(account_update_ctx.commit_key.0)
        {
            return Ok(());
        }

        // Drop pending state on key change
        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != account_update_ctx.commit_key)
        {
            self.drop_pending_commit();
        }

        // Update pending state
        self.pending_commit
            .get_or_insert_with(|| PendingCommit::new(account_update_ctx.commit_key));

        self.persistent_db.upsert_native_account_info(
            account_update_ctx.account,
            AccountInfo {
                nonce: account_update_ctx.nonce,
                ..Default::default()
            },
        );

        Ok(())
    }

    pub fn process(
        &mut self,
        tx_ctx: TxContext,
    ) -> std::result::Result<TxReceipt, EVMError<String>> {
        let commit_key = tx_ctx.block_context.commit_key;

        // Check if already committed and return existing receipt
        let (committed, receipt) = self
            .persistent_db
            .get_committed_receipt(commit_key.0, tx_ctx.tx_hash)
            .map_err(|err| EVMError::Database(format!("commit receipt lookup: {}", err).into()))?;

        if committed {
            match receipt {
                Some(receipt) => return Ok(receipt.into()),
                None => {
                    return Err(EVMError::Database(
                        "found commit, but tx hash is missing".into(),
                    ))
                }
            }
        }

        // Drop pending commit on key change
        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != commit_key)
        {
            self.drop_pending_commit();
        }

        let gas_limit = tx_ctx.gas_limit;
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
                            revm::primitives::InvalidTransaction::CallGasCostMoreThanGasLimit => {
                                return Ok(TxReceipt {
                                    gas_used: gas_limit,
                                    ..Default::default()
                                });
                            }
                            // revm::primitives::InvalidTransaction::PriorityFeeGreaterThanMaxFee => todo!(),
                            // revm::primitives::InvalidTransaction::GasPriceLessThanBasefee => todo!(),
                            // revm::primitives::InvalidTransaction::CallerGasLimitMoreThanBlock => todo!(),
                            // revm::primitives::InvalidTransaction::RejectCallerWithCode => todo!(),
                            // revm::primitives::InvalidTransaction::LackOfFundForMaxFee { fee, balance } => todo!(),
                            // revm::primitives::InvalidTransaction::OverflowPaymentInTransaction => todo!(),
                            // revm::primitives::InvalidTransaction::NonceOverflowInTransaction => todo!(),
                            // revm::primitives::InvalidTransaction::NonceTooHigh { tx, state } => todo!(),
                            // revm::primitives::InvalidTransaction::NonceTooLow { tx, state } => todo!(),
                            // revm::primitives::InvalidTransaction::CreateInitCodeSizeLimit => todo!(),
                            // revm::primitives::InvalidTransaction::InvalidChainId => todo!(),
                            // revm::primitives::InvalidTransaction::AccessListNotSupported => todo!(),
                            // revm::primitives::InvalidTransaction::MaxFeePerBlobGasNotSupported => todo!(),
                            // revm::primitives::InvalidTransaction::BlobVersionedHashesNotSupported => todo!(),
                            // revm::primitives::InvalidTransaction::BlobGasPriceGreaterThanMax => todo!(),
                            // revm::primitives::InvalidTransaction::EmptyBlobs => todo!(),
                            // revm::primitives::InvalidTransaction::BlobCreateTransaction => todo!(),
                            // revm::primitives::InvalidTransaction::TooManyBlobs { max, have } => todo!(),
                            // revm::primitives::InvalidTransaction::BlobVersionNotSupported => todo!(),
                            // revm::primitives::InvalidTransaction::EofInitcodesNotSupported => todo!(),
                            // revm::primitives::InvalidTransaction::EofInitcodesNumberLimit => todo!(),
                            // revm::primitives::InvalidTransaction::EofInitcodesSizeLimit => todo!(),
                            // revm::primitives::InvalidTransaction::EofCrateShouldHaveToAddress => todo!(),
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

    pub fn commit(&mut self, commit_key: CommitKey) -> std::result::Result<(), EVMError<String>> {
        if self.persistent_db.is_height_committed(commit_key.0) {
            assert!(self.pending_commit.is_none());
            return Ok(());
        }

        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != commit_key)
        {
            return Err(EVMError::Database("invalid commit key".into()));
        }

        let outcome = match self.take_pending_commit() {
            Some(pending_commit) => {
                // println!(
                //     "committing {:?} with {} transactions",
                //     commit_key,
                //     pending_commit.diff.len(),
                // );
                state_commit::commit_to_db(&mut self.persistent_db, pending_commit)
            }
            None => Ok(()),
        };

        match outcome {
            Ok(_) => Ok(()),
            Err(err) => Err(EVMError::Database(format!("commit failed: {}", err).into())),
        }
    }

    pub fn state_hash(
        &mut self,
        current_hash: B256,
    ) -> std::result::Result<String, EVMError<String>> {
        let state_commit =
            state_commit::build_commit(self.pending_commit.clone().unwrap_or_default());
        let result = state_hash::calculate(current_hash, &state_commit);

        match result {
            Ok(result) => Ok(result.encode_hex()),
            Err(err) => Err(EVMError::Database(
                format!("state_hash failed: {}", err).into(),
            )),
        }
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

        let mut evm = Evm::builder()
            .with_db(state_db)
            .with_spec_id(ctx.spec_id)
            .modify_block_env(|block_env| {
                let Some(block_ctx) = ctx.block_context.as_ref() else {
                    return;
                };

                block_env.number = U256::from(block_ctx.commit_key.0);
                block_env.coinbase = block_ctx.validator_address;
                block_env.timestamp = block_ctx.timestamp;
                block_env.gas_limit = block_ctx.gas_limit;
                block_env.difficulty = U256::ZERO;
            })
            .modify_tx_env(|tx_env| {
                tx_env.gas_limit = ctx.gas_limit.unwrap_or_else(|| 100_000);
                tx_env.caller = ctx.caller;
                tx_env.transact_to = match ctx.recipient {
                    Some(recipient) => revm::primitives::TransactTo::Call(recipient),
                    None => revm::primitives::TransactTo::Create,
                };

                tx_env.data = ctx.data;
            })
            .build();

        let result = evm.transact();

        match result {
            Ok(result) => {
                let ResultAndState { state, result } = result;

                // Update state if transaction is part of a commit
                if let Some(commit_key) = ctx.block_context.as_ref().map(|b| b.commit_key) {
                    if let Some(pending_commit) = &mut self.pending_commit {
                        assert_eq!(commit_key, pending_commit.key);

                        let state_db = evm.db_mut();

                        state_db.commit(state);

                        pending_commit.cache = std::mem::take(&mut state_db.cache);
                        pending_commit
                            .results
                            .insert(ctx.tx_hash.expect("tx hash"), result.clone());
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

    fn take_pending_commit(&mut self) -> Option<PendingCommit> {
        let pending = self.pending_commit.take();

        if pending.is_none() {
            self.persistent_db.clear_native_account_infos();
        }

        pending
    }

    fn drop_pending_commit(&mut self) {
        self.pending_commit.take();
        self.persistent_db.clear_native_account_infos();
    }
}

fn map_execution_result(result: ExecutionResult) -> TxReceipt {
    match result {
        ExecutionResult::Success {
            gas_used,
            gas_refunded,
            output,
            logs,
            ..
        } => match output {
            revm::primitives::Output::Call(output) => TxReceipt {
                gas_used,
                gas_refunded,
                success: true,
                deployed_contract_address: None,
                logs: Some(logs),
                output: Some(output),
            },
            revm::primitives::Output::Create(output, address) => TxReceipt {
                gas_used,
                gas_refunded,
                success: true,
                deployed_contract_address: address.map(|address| address.to_string()),
                logs: Some(logs),
                output: Some(output),
            },
        },
        ExecutionResult::Revert { gas_used, output } => TxReceipt {
            gas_used,
            success: false,
            gas_refunded: 0,
            deployed_contract_address: None,
            logs: None,
            output: Some(output),
        },
        ExecutionResult::Halt { gas_used, .. } => TxReceipt {
            gas_used,
            success: false,
            gas_refunded: 0,
            deployed_contract_address: None,
            logs: None,
            output: None,
        },
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
    pub fn new(path: JsString) -> Result<Self> {
        let path = path.into_utf8()?.into_owned()?;
        Ok(JsEvmWrapper {
            evm: Arc::new(tokio::sync::Mutex::new(EvmInner::new(path.into()))),
        })
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
    pub fn update_account_info(
        &mut self,
        node_env: Env,
        account_update_ctx: JsAccountUpdateContext,
    ) -> Result<JsObject> {
        let account_update_ctx = AccountUpdateContext::try_from(account_update_ctx)?;
        node_env.execute_tokio_future(
            Self::update_account_info_async(self.evm.clone(), account_update_ctx),
            |_, _| Ok(()),
        )
    }

    #[napi(ts_return_type = "Promise<JsAccountInfo>")]
    pub fn get_account_info(&mut self, node_env: Env, address: JsString) -> Result<JsObject> {
        let address = utils::create_address_from_js_string(address)?;
        node_env.execute_tokio_future(
            Self::get_account_info_async(self.evm.clone(), address),
            |&mut node_env, result| Ok(result::JsAccountInfo::new(&node_env, result)?),
        )
    }

    #[napi(ts_return_type = "Promise<JsCommitResult>")]
    pub fn commit(&mut self, node_env: Env, commit_key: JsCommitKey) -> Result<JsObject> {
        let commit_key = CommitKey::try_from(commit_key)?;
        node_env.execute_tokio_future(
            Self::commit_async(self.evm.clone(), commit_key),
            |&mut node_env, _| Ok(result::JsCommitResult::new(&node_env)?),
        )
    }

    #[napi(ts_return_type = "Promise<string>")]
    pub fn state_hash(&mut self, node_env: Env, current_hash: JsString) -> Result<JsObject> {
        let current_hash = utils::convert_string_to_b256(current_hash)?;
        node_env.execute_tokio_future(
            Self::state_hash_async(self.evm.clone(), current_hash),
            |&mut node_env, result| Ok(node_env.create_string_from_std(result)?),
        )
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
    ) -> Result<AccountInfo> {
        let mut lock = evm.lock().await;
        let result = lock.get_account_info(address);

        match result {
            Ok(account) => Result::Ok(account),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn update_account_info_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        account_update_ctx: AccountUpdateContext,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.update_account_info(account_update_ctx);

        match result {
            Ok(_) => Result::Ok(()),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn commit_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        commit_key: CommitKey,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.commit(commit_key);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }

    async fn state_hash_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        current_hash: B256,
    ) -> Result<String> {
        let mut lock = evm.lock().await;
        let result = lock.state_hash(current_hash);

        match result {
            Ok(result) => Result::Ok(result),
            Err(err) => Result::Err(serde::de::Error::custom(err)),
        }
    }
}
