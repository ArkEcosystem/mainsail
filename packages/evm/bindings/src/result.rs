use mainsail_evm_core::{db::TinyReceipt, state_changes::AccountChange};
use napi::{JsBigInt, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{AccountInfo, Address, Bytes, Log};
use std::collections::HashMap;

use crate::{ctx::JsAccountChange, utils};

#[napi(object)]
pub struct JsProcessResult {
    pub receipt: JsTransactionReceipt,
}
impl JsProcessResult {
    pub fn new(node_env: &napi::Env, receipt: TxReceipt) -> anyhow::Result<Self> {
        Ok(Self {
            receipt: JsTransactionReceipt::new(node_env, receipt)?,
        })
    }
}

#[napi(object)]
pub struct JsCommitResult {}

impl JsCommitResult {
    pub fn new(_node_env: &napi::Env) -> anyhow::Result<Self> {
        Ok(Self {})
    }
}

#[napi(object)]
pub struct JsViewResult {
    pub success: bool,
    pub output: Option<JsBuffer>,
}
impl JsViewResult {
    pub fn new(node_env: &napi::Env, result: TxViewResult) -> anyhow::Result<Self> {
        Ok(Self {
            success: result.success,
            output: result.output.map(|o| {
                node_env
                    .create_buffer_with_data(Into::<Vec<u8>>::into(o))
                    .unwrap()
                    .into_raw()
            }),
        })
    }
}

#[napi(object)]
pub struct JsTransactionReceipt {
    pub gas_used: JsBigInt,
    pub gas_refunded: JsBigInt,
    pub success: bool,
    pub deployed_contract_address: Option<JsString>,
    pub logs: serde_json::Value,
    pub output: Option<JsBuffer>,
    pub changes: Option<HashMap<String, JsAccountChange>>,
}

#[derive(Default)]
pub struct TxReceipt {
    pub gas_used: u64,
    pub gas_refunded: u64,
    pub success: bool,
    pub deployed_contract_address: Option<String>,
    pub logs: Option<Vec<Log>>,
    pub output: Option<Bytes>,
    pub changes: Option<HashMap<Address, AccountChange>>,
}

impl From<TinyReceipt> for TxReceipt {
    fn from(value: TinyReceipt) -> Self {
        Self {
            gas_used: value.gas_used,
            gas_refunded: 0,
            success: value.success,
            deployed_contract_address: value.deployed_contract.map(|a| a.to_string()),
            logs: None,
            output: None,
            changes: value.changes,
        }
    }
}

pub struct TxViewResult {
    pub success: bool,
    pub output: Option<Bytes>,
}

impl JsTransactionReceipt {
    pub fn new(node_env: &napi::Env, receipt: TxReceipt) -> anyhow::Result<Self> {
        let deployed_contract_address =
            if let Some(contract_address) = receipt.deployed_contract_address {
                Some(node_env.create_string_from_std(contract_address)?)
            } else {
                None
            };

        let mut changes = Default::default();
        if let Some(inner) = receipt.changes {
            let mut values = HashMap::with_capacity(inner.len());

            for (address, change) in inner {
                values.insert(
                    address.to_string(),
                    JsAccountChange {
                        balance: utils::convert_u256_to_bigint(node_env, change.balance)?,
                        nonce: node_env.create_bigint_from_u64(change.nonce)?,
                    },
                );
            }

            changes = Some(values);
        }

        Ok(JsTransactionReceipt {
            gas_used: node_env.create_bigint_from_u64(receipt.gas_used)?,
            gas_refunded: node_env.create_bigint_from_u64(receipt.gas_refunded)?,
            success: receipt.success,
            deployed_contract_address,
            logs: receipt
                .logs
                .map(|l| serde_json::to_value(l).unwrap())
                .unwrap_or_else(|| serde_json::Value::Null),
            output: receipt.output.map(|o| {
                node_env
                    .create_buffer_with_data(Into::<Vec<u8>>::into(o))
                    .unwrap()
                    .into_raw()
            }),
            changes,
        })
    }
}

#[napi(object)]
pub struct JsAccountInfo {
    pub balance: JsBigInt,
    pub nonce: JsBigInt,
}

impl JsAccountInfo {
    pub fn new(node_env: &napi::Env, account_info: AccountInfo) -> anyhow::Result<Self> {
        Ok(JsAccountInfo {
            nonce: node_env.create_bigint_from_u64(account_info.nonce)?,
            balance: utils::convert_u256_to_bigint(node_env, account_info.balance)?,
        })
    }
}
