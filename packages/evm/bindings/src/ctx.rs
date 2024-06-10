use mainsail_evm_core::db::CommitKey;
use napi::{JsBigInt, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{Address, Bytes, U256};

use crate::utils;

#[napi(object)]
pub struct JsTransactionContext {
    pub caller: JsString,
    /// Omit recipient when deploying a contract
    pub recipient: Option<JsString>,
    pub gas_limit: JsBigInt,
    pub data: JsBuffer,
    pub block_context: JsBlockContext,
}

#[napi(object)]
pub struct JsTransactionViewContext {
    pub caller: JsString,
    pub recipient: JsString,
    pub data: JsBuffer,
}

#[napi(object)]
pub struct JsBlockContext {
    pub commit_key: JsCommitKey,
    pub gas_limit: JsBigInt,
    pub timestamp: JsBigInt,
    pub validator_address: JsString,
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
    pub gas_limit: u64,
    pub data: Bytes,
    pub block_context: BlockContext,
}

pub struct TxViewContext {
    pub caller: Address,
    pub recipient: Address,
    pub data: Bytes,
}

pub struct BlockContext {
    pub commit_key: CommitKey,
    pub gas_limit: U256,
    pub timestamp: U256,
    pub validator_address: Address,
}

pub struct ExecutionContext {
    pub caller: Address,
    pub recipient: Option<Address>,
    pub gas_limit: Option<u64>,
    pub data: Bytes,
    pub block_context: Option<BlockContext>,
}

impl From<TxViewContext> for ExecutionContext {
    fn from(value: TxViewContext) -> Self {
        Self {
            caller: value.caller,
            recipient: Some(value.recipient),
            gas_limit: None,
            data: value.data,
            block_context: None,
        }
    }
}

impl From<TxContext> for ExecutionContext {
    fn from(value: TxContext) -> Self {
        Self {
            caller: value.caller,
            recipient: value.recipient,
            gas_limit: Some(value.gas_limit),
            data: value.data,
            block_context: Some(value.block_context),
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

impl TryFrom<JsBlockContext> for BlockContext {
    type Error = anyhow::Error;

    fn try_from(value: JsBlockContext) -> Result<Self, Self::Error> {
        Ok(BlockContext {
            commit_key: value.commit_key.try_into()?,
            gas_limit: U256::from(value.gas_limit.get_u64()?.0),
            timestamp: U256::from(value.timestamp.get_u64()?.0),
            validator_address: utils::create_address_from_js_string(value.validator_address)?,
        })
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
            recipient,
            gas_limit: value.gas_limit.try_into()?,
            caller: utils::create_address_from_js_string(value.caller)?,
            data: Bytes::from(buf.as_ref().to_owned()),
            block_context: value.block_context.try_into()?,
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
