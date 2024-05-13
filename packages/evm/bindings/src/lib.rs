use std::{convert::Infallible, str::FromStr, sync::Arc};

use ctx::{
    ExecutionContext, JsCommitKey, JsTransactionContext, JsTransactionViewContext, PendingCommit,
    TxContext, TxViewContext,
};
use mainsail_evm_core::EvmInstance;
use napi::{bindgen_prelude::*, JsBigInt, JsObject, JsString};
use napi_derive::napi;
use result::{TxReceipt, TxViewResult};
use revm::{
    primitives::{AccountInfo, Address, EVMError, ExecutionResult, ResultAndState, U256},
    DatabaseCommit,
};

use crate::ctx::CommitKey;

mod ctx;
mod result;
mod utils;

// A complex struct which cannot be exposed to JavaScript directly.
pub struct EvmInner {
    // 'Option' is used because of the ownership changing when updating the EVM.
    evm_instance: Option<EvmInstance>,

    // A pending commit consists of one or more transactions.
    pending_commit: Option<PendingCommit>,
}

// NOTE: we guarantee that this can be sent between threads, since it only is accessed through a mutex
unsafe impl Send for EvmInner {}

impl EvmInner {
    pub fn new() -> Self {
        let evm = mainsail_evm_core::create_evm_instance();
        EvmInner {
            evm_instance: Some(evm),
            pending_commit: Default::default(),
        }
    }

    pub fn view(&mut self, tx_ctx: TxViewContext) -> Result<TxViewResult> {
        let result = self.transact_evm(tx_ctx.into());

        Ok(match result {
            Ok(r) => TxViewResult {
                success: r.result.is_success(),
                output: r.result.into_output(),
            },
            Err(_) => TxViewResult {
                success: false,
                output: None,
            },
        })
    }

    pub fn process(&mut self, tx_ctx: TxContext) -> Result<TxReceipt> {
        let commit_key = tx_ctx.commit_key;

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
                let receipt = map_execution_result(result.result.clone());

                let pending_commit = self
                    .pending_commit
                    .get_or_insert_with(|| PendingCommit::new(commit_key));

                assert_eq!(pending_commit.key, commit_key);
                pending_commit.diff.push(result);

                Ok(receipt)
            }
            Err(_) => todo!(),
        }
    }

    pub fn commit(&mut self, commit_key: CommitKey) -> std::result::Result<(), EVMError<String>> {
        if self
            .pending_commit
            .as_ref()
            .is_some_and(|pending| pending.key != commit_key)
        {
            return Err(EVMError::Database("invalid commit key".into()));
        }

        match self.pending_commit.take() {
            Some(mut pending_commit) => {
                // println!(
                //     "committing {:?} with {} transactions",
                //     commit_key,
                //     pending_commit.diff.len(),
                // );

                let db = self.evm_instance.as_mut().expect("get evm").db_mut();
                for pending in pending_commit.diff.drain(..) {
                    db.commit(pending.state);
                }

                Ok(())
            }
            None => Ok(()), /* nothing to commit  */
        }
    }
    fn transact_evm(
        &mut self,
        ctx: ExecutionContext,
    ) -> std::result::Result<ResultAndState, EVMError<Infallible>> {
        let mut evm = self.evm_instance.take().expect("ok");

        // Prepare the EVM to run the given transaction
        let mut original_db = Option::default();

        evm = evm
            .modify()
            .modify_db(|db| {
                // Ensure pending commits from same round are visible to the transaction being applied
                if let Some(inner) = ctx.commit_key {
                    if let Some(pending) = self
                        .pending_commit
                        .as_mut()
                        .filter(|pending| pending.key == inner)
                    {
                        // TODO: don't deep clone db
                        let mut temp_db = db.clone();
                        for pending in &pending.diff {
                            temp_db.commit(pending.state.clone());
                        }

                        original_db = Some(std::mem::take(db));
                        *db = temp_db;
                    }
                }
            })
            .modify_tx_env(|tx_env| {
                tx_env.caller = ctx.caller;
                tx_env.transact_to = match ctx.recipient {
                    Some(recipient) => revm::primitives::TransactTo::Call(recipient),
                    None => {
                        revm::primitives::TransactTo::Create(revm::primitives::CreateScheme::Create)
                    }
                };

                tx_env.data = ctx.data;

                // tracing::debug!("{:#?}", tx_env);
            })
            .build();

        let result = evm.transact();

        // Reset any pending DB changes by rolling back to the original DB
        if let Some(mut original_db) = original_db {
            evm = evm
                .modify()
                .modify_db(|db| {
                    std::mem::swap(db, &mut original_db);
                })
                .build();
        }

        self.evm_instance.replace(evm);

        // TODO: error handling

        result
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
    pub fn new() -> Self {
        JsEvmWrapper {
            evm: Arc::new(tokio::sync::Mutex::new(EvmInner::new())),
        }
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
