use std::{str::FromStr, sync::Arc};

use mainsail_evm_core::EvmInstance;
use napi::{bindgen_prelude::*, JsBigInt, JsBuffer, JsObject, JsString};
use napi_derive::napi;
use revm::primitives::{AccountInfo, Address, Bytes, ExecutionResult, Log, U256};

pub struct TxResult {
    gas_used: u64,
    gas_refunded: u64,
    success: bool,
    // TODO: expose additional data needed to JS
    deployed_contract_address: Option<String>,
    logs: Option<Vec<Log>>,
    output: Option<Bytes>,
}

// A complex struct which cannot be exposed to JavaScript directly.
pub struct EvmInner {
    // 'Option' is used because of the ownership changing when updating the EVM.
    evm_instance: Option<EvmInstance>,
}

// NOTE: we guarantee that this can be sent between threads, since it only is accessed through a mutex
unsafe impl Send for EvmInner {}

pub struct TxContext {
    pub caller: Address,
    /// Omit recipient when deploying a contract
    pub recipient: Option<Address>,
    pub data: Bytes,
}

impl From<JsTransactionContext> for TxContext {
    fn from(value: JsTransactionContext) -> Self {
        let buf = value.data.into_value().unwrap();
        TxContext {
            caller: Address::from_str(value.caller.into_utf8().unwrap().as_str().unwrap()).unwrap(),
            recipient: value
                .recipient
                .map(|v| Address::from_str(v.into_utf8().unwrap().as_str().unwrap()).unwrap()),
            data: Bytes::from(buf.as_ref().to_owned()),
        }
    }
}

pub struct UpdateAccountInfoCtx {
    pub address: Address,
    pub balance: U256,
    pub nonce: u64,
}

impl UpdateAccountInfoCtx {
    pub fn new_from_js(account_info: JsAccountInfo) -> Self {
        UpdateAccountInfoCtx {
            address: Address::from_str(account_info.address.into_utf8().unwrap().as_str().unwrap())
                .unwrap(),
            balance: U256::from_str(
                account_info
                    .balance
                    .coerce_to_string()
                    .unwrap()
                    .into_utf8()
                    .unwrap()
                    .as_str()
                    .unwrap(),
            )
            .unwrap(),
            nonce: account_info
                .nonce
                .coerce_to_string()
                .unwrap()
                .into_utf8()
                .unwrap()
                .as_str()
                .unwrap()
                .parse::<u64>()
                .unwrap(),
        }
    }
}

impl EvmInner {
    pub fn new() -> Self {
        let evm = mainsail_evm_core::create_evm_instance();
        EvmInner {
            evm_instance: Some(evm),
        }
    }

    pub fn update_account_info(&mut self, address: Address, account_info: AccountInfo) {
        println!("update_account_info {} {:#?}", address, account_info);

        let evm = &mut self.evm_instance.as_mut().expect("get evm").context.evm;

        let db = &mut evm.db;
        let journal = &mut evm.journaled_state;

        let (account, _) = journal.load_account(address, db).unwrap();
        account.info = account_info;
    }

    pub fn get_account_info(&mut self, address: Address) -> Option<AccountInfo> {
        println!("get_account_info {}", address);

        let evm = &mut self.evm_instance.as_mut().expect("get evm").context.evm;

        let db = &mut evm.db;
        let journal = &mut evm.journaled_state;

        let (account, _) = journal.load_account(address, db).unwrap();
        Some(account.info.clone())
    }

    pub fn transact(&mut self, tx_ctx: TxContext) -> TxResult {
        self.transact_evm(tx_ctx, true)
    }

    pub fn transact_readonly(&mut self, tx_ctx: TxContext) -> TxResult {
        self.transact_evm(tx_ctx, false)
    }

    fn transact_evm(&mut self, tx_ctx: TxContext, commit: bool) -> TxResult {
        let mut evm = self.evm_instance.take().expect("ok");

        evm = evm
            .modify()
            .modify_tx_env(|tx_env| {
                tx_env.caller = tx_ctx.caller;
                tx_env.transact_to = match tx_ctx.recipient {
                    Some(recipient) => revm::primitives::TransactTo::Call(recipient),
                    None => {
                        revm::primitives::TransactTo::Create(revm::primitives::CreateScheme::Create)
                    }
                };

                tx_env.data = tx_ctx.data;

                // tracing::debug!("{:#?}", tx_env);
            })
            .build();

        let result = if commit {
            evm.transact_commit()
        } else {
            // TODO: return state to caller?
            evm.transact()
                .map(|result_and_state| result_and_state.result)
        };

        self.evm_instance.replace(evm);

        match result {
            Ok(result) => match result {
                ExecutionResult::Success {
                    gas_used,
                    gas_refunded,
                    output,
                    logs,
                    ..
                } => match output {
                    revm::primitives::Output::Call(output) => TxResult {
                        gas_used,
                        gas_refunded,
                        success: true,
                        deployed_contract_address: None,
                        logs: Some(logs),
                        output: Some(output),
                    },
                    revm::primitives::Output::Create(output, address) => TxResult {
                        gas_used,
                        gas_refunded,
                        success: true,
                        deployed_contract_address: address.map(|address| address.to_string()),
                        logs: Some(logs),
                        output: Some(output),
                    },
                },
                ExecutionResult::Revert { gas_used, output } => TxResult {
                    gas_used,
                    success: false,
                    gas_refunded: 0,
                    deployed_contract_address: None,
                    logs: None,
                    output: Some(output),
                },
                ExecutionResult::Halt { gas_used, .. } => TxResult {
                    gas_used,
                    success: false,
                    gas_refunded: 0,
                    deployed_contract_address: None,
                    logs: None,
                    output: None,
                },
            },
            Err(_err) => todo!(), // TODO: should never happen?
        }
    }
}

#[napi(object)]
pub struct JsTransactionContext {
    pub caller: JsString,
    /// Omit recipient when deploying a contract
    pub recipient: Option<JsString>,
    pub data: JsBuffer,
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

#[napi(object)]
pub struct JsTransactionResult {
    pub gas_used: JsBigInt,
    pub gas_refunded: JsBigInt,
    pub success: bool,
    pub deployed_contract_address: Option<JsString>,
    pub logs: serde_json::Value,
    pub output: Option<JsBuffer>,
}

#[napi]
impl JsEvmWrapper {
    #[napi(constructor)]
    pub fn new() -> Self {
        JsEvmWrapper {
            evm: Arc::new(tokio::sync::Mutex::new(EvmInner::new())),
        }
    }

    #[napi(ts_return_type = "Promise<JsTransactionResult>")]
    pub fn transact(&mut self, node_env: Env, tx_ctx: JsTransactionContext) -> Result<JsObject> {
        let tx_ctx = TxContext::from(tx_ctx);
        node_env.execute_tokio_future(
            Self::transact_async(self.evm.clone(), tx_ctx),
            |&mut node_env, result| Ok(Self::to_result(node_env, result)),
        )
    }

    #[napi(ts_return_type = "Promise<JsTransactionResult>")]
    pub fn view(&mut self, node_env: Env, tx_ctx: JsTransactionContext) -> Result<JsObject> {
        let tx_ctx = TxContext::from(tx_ctx);
        node_env.execute_tokio_future(
            Self::view_async(self.evm.clone(), tx_ctx),
            |&mut node_env, result| Ok(Self::to_result(node_env, result)),
        )
    }

    #[napi(ts_return_type = "Promise<JsAccountInfo>")]
    pub fn get_account_info(&mut self, node_env: Env, address: String) -> Result<JsObject> {
        let address = Address::from_str(&address).unwrap();

        node_env.execute_tokio_future(
            Self::get_account_info_async(self.evm.clone(), address),
            |&mut node_env, result| Ok(Self::to_account_info(node_env, result.0, result.1)),
        )
    }

    #[napi(ts_return_type = "Promise<void>")]
    pub fn update_account_info(
        &mut self,
        node_env: Env,
        account_info: JsAccountInfo,
    ) -> Result<JsObject> {
        let update_account_info_ctx = UpdateAccountInfoCtx::new_from_js(account_info);
        node_env.execute_tokio_future(
            Self::update_account_info_async(self.evm.clone(), update_account_info_ctx),
            |_, result| Ok(result),
        )
    }

    async fn transact_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        tx_ctx: TxContext,
    ) -> Result<TxResult> {
        let mut lock = evm.lock().await;
        let result = lock.transact(tx_ctx);
        Ok(result)
    }

    async fn view_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        tx_ctx: TxContext,
    ) -> Result<TxResult> {
        let mut lock = evm.lock().await;
        let result = lock.transact_readonly(tx_ctx);
        Ok(result)
    }

    async fn get_account_info_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        address: Address,
    ) -> Result<(Address, Option<AccountInfo>)> {
        let mut lock = evm.lock().await;
        let result = lock.get_account_info(address);
        Ok((address, result))
    }

    async fn update_account_info_async(
        evm: Arc<tokio::sync::Mutex<EvmInner>>,
        update_account_info_ctx: UpdateAccountInfoCtx,
    ) -> Result<()> {
        let mut lock = evm.lock().await;
        let result = lock.update_account_info(
            update_account_info_ctx.address,
            AccountInfo {
                balance: update_account_info_ctx.balance,
                nonce: update_account_info_ctx.nonce,
                ..Default::default()
            },
        );
        Ok(result)
    }

    fn to_account_info(
        node_env: Env,
        address: Address,
        account_info: Option<AccountInfo>,
    ) -> JsAccountInfo {
        match account_info {
            Some(account_info) => JsAccountInfo {
                address: node_env
                    .create_string_from_std(address.to_string())
                    .unwrap(),
                balance: convert_u256_to_bigint(node_env, account_info.balance),
                nonce: node_env.create_bigint_from_u64(account_info.nonce).unwrap(),
            },
            None => JsAccountInfo {
                address: node_env
                    .create_string_from_std(address.to_string())
                    .unwrap(),
                balance: node_env.create_bigint_from_u64(0).unwrap(),
                nonce: node_env.create_bigint_from_u64(0).unwrap(),
            },
        }
    }

    fn to_result(node_env: Env, result: TxResult) -> JsTransactionResult {
        JsTransactionResult {
            gas_used: node_env.create_bigint_from_u64(result.gas_used).unwrap(),
            gas_refunded: node_env
                .create_bigint_from_u64(result.gas_refunded)
                .unwrap(),
            success: result.success,
            deployed_contract_address: result
                .deployed_contract_address
                .map(|a| node_env.create_string_from_std(a).unwrap()),
            logs: result
                .logs
                .map(|l| serde_json::to_value(l).unwrap())
                .unwrap_or_else(|| serde_json::Value::Null),

            output: result.output.map(|o| {
                node_env
                    .create_buffer_with_data(Into::<Vec<u8>>::into(o))
                    .unwrap()
                    .into_raw()
            }),
        }
    }
}

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
