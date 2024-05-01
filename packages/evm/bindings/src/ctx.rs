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
    // Must be provided for mutable transactions
    pub commit_key: Option<JsCommitKey>,
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
    // Must be provided for mutable transactions
    pub commit_key: Option<CommitKey>,
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

        let commit_key = if let Some(commit_key) = value.commit_key {
            Some(commit_key.try_into()?)
        } else {
            None
        };

        let tx_ctx = TxContext {
            commit_key,
            recipient,
            caller: utils::create_address_from_js_string(value.caller)?,
            data: Bytes::from(buf.as_ref().to_owned()),
        };

        Ok(tx_ctx)
    }
}
