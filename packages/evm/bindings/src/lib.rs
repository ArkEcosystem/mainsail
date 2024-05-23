use std::{path::PathBuf, rc::Rc, sync::Arc};

use ctx::{
    ExecutionContext, JsCommitKey, JsTransactionContext, JsTransactionViewContext, TxContext,
    TxViewContext,
};
use mainsail_evm_core::db::{CommitKey, PendingCommit, PersistentDB};
use napi::{bindgen_prelude::*, JsBigInt, JsObject, JsString};
use napi_derive::napi;
use result::{TxReceipt, TxViewResult};
use revm::{
    db::{State, WrapDatabaseRef},
    primitives::{Address, EVMError, ExecutionResult, ResultAndState, U256},
    DatabaseCommit, Evm, TransitionAccount,
};

mod ctx;
mod result;
mod utils;

// A complex struct which cannot be exposed to JavaScript directly.
pub struct EvmInner {
    persistent_db: Rc<PersistentDB>,

    // A pending commit consists of one or more transactions.
    pending_commit: Option<PendingCommit>,
}

// NOTE: we guarantee that this can be sent between threads, since it only is accessed through a mutex
unsafe impl Send for EvmInner {}

impl EvmInner {
    pub fn new(path: PathBuf) -> Self {
        let persistent_db = Rc::new(PersistentDB::new(path).expect("path ok"));

        EvmInner {
            persistent_db: persistent_db.clone(),
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

    pub fn process(&mut self, tx_ctx: TxContext) -> Result<TxReceipt> {
        let commit_key = tx_ctx.commit_key;

        if self.persistent_db.is_height_committed(commit_key.0) {
            return Ok(skipped_tx_receipt());
        }

        // Drop pending commit on key change
        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != commit_key)
        {
            self.pending_commit.take();
        }

        let result = self.transact_evm(tx_ctx.into());

        match result {
            Ok(result) => {
                let receipt = map_execution_result(result);
                Ok(receipt)
            }
            Err(err) => {
                println!("err {:?}", err);
                todo!()
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

        let outcome = match self.pending_commit.take() {
            Some(pending_commit) => {
                // println!(
                //     "committing {:?} with {} transactions",
                //     commit_key,
                //     pending_commit.diff.len(),
                // );

                match self.persistent_db.commit(pending_commit) {
                    Ok(()) => Ok(()),
                    Err(err) => Err(err),
                }
            }
            None => Ok(()), /* nothing to commit  */
        };

        match outcome {
            Ok(_) => Ok(()),
            Err(err) => Err(EVMError::Database(format!("commit failed: {}", err).into())),
        }
    }

    fn transact_evm(
        &mut self,
        ctx: ExecutionContext,
    ) -> std::result::Result<ExecutionResult, EVMError<mainsail_evm_core::db::Error>> {
        let persistent_db = self.persistent_db.as_ref();

        let mut state_builder = State::builder().with_bundle_update();

        if let Some(commit_key) = ctx.commit_key {
            let pending_commit = self
                .pending_commit
                .get_or_insert_with(|| PendingCommit::new(commit_key));

            state_builder =
                state_builder.with_cached_prestate(std::mem::take(&mut pending_commit.cache));
        }

        let state_db = state_builder
            .with_database(WrapDatabaseRef(persistent_db))
            .build();

        let mut evm = Evm::builder()
            .with_db(state_db)
            .modify_tx_env(|tx_env| {
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
                if let Some(commit_key) = ctx.commit_key {
                    if let Some(pending_commit) = &mut self.pending_commit {
                        assert_eq!(commit_key, pending_commit.key);

                        let state_db = evm.db_mut();

                        state_db.commit(state);

                        pending_commit.cache = std::mem::take(&mut state_db.cache);
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
}

const fn skipped_tx_receipt() -> TxReceipt {
    TxReceipt {
        gas_used: 0,
        gas_refunded: 0,
        success: true,
        deployed_contract_address: None,
        logs: None,
        output: None,
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

#[napi(object)]
pub struct JsAccountInfo {
    pub address: JsString,
    pub balance: JsBigInt,
    pub nonce: JsBigInt,
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

    #[napi(ts_return_type = "Promise<JsCommitResult>")]
    pub fn commit(&mut self, node_env: Env, commit_key: JsCommitKey) -> Result<JsObject> {
        let commit_key = CommitKey::try_from(commit_key)?;
        node_env.execute_tokio_future(
            Self::commit_async(self.evm.clone(), commit_key),
            |&mut node_env, _| Ok(result::JsCommitResult::new(&node_env)?),
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
        lock.process(tx_ctx)
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
}

#[allow(unused)]
fn convert_u256_to_bigint(node_env: Env, value: U256) -> JsBigInt {
    let slice = value.as_le_slice();

    const WORD_SIZE: usize = 8;
    assert!(slice.len() % WORD_SIZE == 0);

    // https://nodejs.org/api/n-api.html#n_api_napi_create_bigint_words
    let mut words: Vec<u64> = Vec::with_capacity(slice.len() / WORD_SIZE);
    for chunk in slice.chunks_exact(WORD_SIZE) {
        let mut bytes = [0; 8];
        bytes.copy_from_slice(chunk);
        words.push(u64::from_le_bytes(bytes));
    }

    node_env.create_bigint_from_words(false, words).unwrap()
}
