use napi::{JsBigInt, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{Bytes, Log};

#[napi(object)]
pub struct JsTransactionResult {
    pub gas_used: JsBigInt,
    pub gas_refunded: JsBigInt,
    pub success: bool,
    pub deployed_contract_address: Option<JsString>,

    // TODO: typing
    pub logs: serde_json::Value,
    pub output: Option<JsBuffer>,
}

pub struct TxResult {
    pub gas_used: u64,
    pub gas_refunded: u64,
    pub success: bool,
    // TODO: expose additional data needed to JS
    pub deployed_contract_address: Option<String>,
    pub logs: Option<Vec<Log>>,
    pub output: Option<Bytes>,
}

impl JsTransactionResult {
    pub fn new(node_env: napi::Env, result: TxResult) -> anyhow::Result<Self> {
        let deployed_contract_address =
            if let Some(contract_address) = result.deployed_contract_address {
                Some(node_env.create_string_from_std(contract_address)?)
            } else {
                None
            };

        let result = JsTransactionResult {
            gas_used: node_env.create_bigint_from_u64(result.gas_used)?,
            gas_refunded: node_env.create_bigint_from_u64(result.gas_refunded)?,
            success: result.success,
            deployed_contract_address,
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
        };

        Ok(result)
    }
}
