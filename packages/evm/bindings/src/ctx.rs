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
    pub commit_key: JsCommitKey,
}

#[napi(object)]
pub struct JsTransactionViewContext {
    pub caller: JsString,
    pub recipient: JsString,
    pub data: JsBuffer,
}

#[napi(object)]
pub struct JsCommitKey {
    pub height: JsBigInt,
    pub round: JsBigInt,
}

pub struct TxContext {
    pub caller: Address,
    /// Omit recipient when deploying a contract
    pub recipient: Option<Address>,
    pub data: Bytes,
    pub commit_key: CommitKey,
}

pub struct TxViewContext {
    pub caller: Address,
    pub recipient: Address,
    pub data: Bytes,
}

// A (height, round) pair used to associate state with a processable unit.
#[derive(Hash, PartialEq, Eq, Debug, Default, Clone, Copy)]
pub struct CommitKey(pub u64, pub u64);

pub struct PendingCommit {
    pub key: CommitKey,
    pub diff: Vec<ResultAndState>,
}

impl PendingCommit {
    pub fn new(key: CommitKey) -> Self {
        Self {
            key,
            diff: Default::default(),
        }
    }
}

pub struct ExecutionContext {
    pub caller: Address,
    pub recipient: Option<Address>,
    pub data: Bytes,
    pub commit_key: Option<CommitKey>,
}

impl From<TxViewContext> for ExecutionContext {
    fn from(value: TxViewContext) -> Self {
        Self {
            caller: value.caller,
            recipient: Some(value.recipient),
            data: value.data,
            commit_key: None,
        }
    }
}

impl From<TxContext> for ExecutionContext {
    fn from(value: TxContext) -> Self {
        Self {
            caller: value.caller,
            recipient: value.recipient,
            data: value.data,
            commit_key: Some(value.commit_key),
        }
    }
}

impl TryFrom<JsCommitKey> for CommitKey {
    type Error = anyhow::Error;

    fn try_from(value: JsCommitKey) -> Result<Self, Self::Error> {
        Ok(CommitKey(
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

        let tx_ctx = TxContext {
            commit_key: value.commit_key.try_into()?,
            recipient,
            caller: utils::create_address_from_js_string(value.caller)?,
            data: Bytes::from(buf.as_ref().to_owned()),
        };

        Ok(tx_ctx)
    }
}

impl TryFrom<JsTransactionViewContext> for TxViewContext {
    type Error = anyhow::Error;

    fn try_from(value: JsTransactionViewContext) -> std::result::Result<Self, Self::Error> {
        let buf = value.data.into_value()?;

        let tx_ctx = TxViewContext {
            caller: utils::create_address_from_js_string(value.caller)?,
            recipient: utils::create_address_from_js_string(value.recipient)?,
            data: Bytes::from(buf.as_ref().to_owned()),
        };

        Ok(tx_ctx)
    }
}
