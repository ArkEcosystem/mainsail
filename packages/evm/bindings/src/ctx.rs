use napi::{JsBoolean, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{Address, Bytes};

use crate::utils;

#[napi(object)]
pub struct JsTransactionContext {
    pub caller: JsString,
    /// Omit recipient when deploying a contract
    pub recipient: Option<JsString>,
    pub data: JsBuffer,
    pub readonly: JsBoolean,
}

pub struct TxContext {
    pub readonly: bool,
    pub caller: Address,
    /// Omit recipient when deploying a contract
    pub recipient: Option<Address>,
    pub data: Bytes,
}

impl TryFrom<JsTransactionContext> for TxContext {
    type Error = anyhow::Error;

    fn try_from(value: JsTransactionContext) -> std::result::Result<Self, Self::Error> {
        let buf = value.data.into_value()?;

        let recipient = if let Some(recipient) = value.recipient {
            Some(utils::create_address_from_js_string(recipient)?)
        } else {
            None
        };

        let tx_ctx = TxContext {
            readonly: value.readonly.get_value()?,
            recipient,
            caller: utils::create_address_from_js_string(value.caller)?,
            data: Bytes::from(buf.as_ref().to_owned()),
        };

        Ok(tx_ctx)
    }
}
