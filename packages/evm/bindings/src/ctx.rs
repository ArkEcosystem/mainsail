use napi::{JsBigInt, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{Address, Bytes, ResultAndState};

use crate::utils;

#[napi(object)]
pub struct JsTransactionContext {
    pub caller: JsString,
    /// Omit recipient when deploying a contract
    pub recipient: Option<JsString>,
    pub data: JsBuffer,
    // Must be provided for non-readonly transactions
    pub round_key: Option<JsRoundKey>,
}

#[napi(object)]
pub struct JsRoundKey {
    pub height: JsBigInt,
    pub round: JsBigInt,
}

pub struct TxContext {
    pub caller: Address,
    /// Omit recipient when deploying a contract
    pub recipient: Option<Address>,
    pub data: Bytes,
    // Must be provided for non-readonly transactions
    pub round_key: Option<RoundKey>,
}

// A (height, round) pair used to associate data with a processable unit.
#[derive(Hash, PartialEq, Eq, Debug, Clone, Copy)]
pub struct RoundKey(pub u64, pub u64);

pub struct PendingCommit {
    pub key: RoundKey,
    pub diff: Vec<ResultAndState>,
}

impl PendingCommit {
    pub fn new(key: RoundKey) -> Self {
        Self {
            key,
            diff: Default::default(),
        }
    }
}

impl TryFrom<JsRoundKey> for RoundKey {
    type Error = anyhow::Error;

    fn try_from(value: JsRoundKey) -> Result<Self, Self::Error> {
        Ok(RoundKey(
            value.height.get_u64()?.0,
            value.round.get_u64()?.0,
        ))
    }
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

        let round_key = if let Some(round_key) = value.round_key {
            Some(round_key.try_into()?)
        } else {
            None
        };

        let tx_ctx = TxContext {
            round_key,
            recipient,
            caller: utils::create_address_from_js_string(value.caller)?,
            data: Bytes::from(buf.as_ref().to_owned()),
        };

        Ok(tx_ctx)
    }
}
