use std::str::FromStr;

use mainsail_evm_core::db::CommitKey;
use napi::{JsBigInt, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{Address, Bytes, SpecId, B256, U256};

use crate::utils;

#[napi(object)]
pub struct JsTransactionContext {
    pub caller: JsString,
    /// Omit recipient when deploying a contract
    pub recipient: Option<JsString>,
    pub gas_limit: JsBigInt,
    pub data: JsBuffer,
    pub tx_hash: JsString,
    pub block_context: JsBlockContext,
    pub spec_id: JsString,
}

#[napi(object)]
pub struct JsTransactionViewContext {
    pub caller: JsString,
    pub recipient: JsString,
    pub data: JsBuffer,
    pub spec_id: JsString,
}

#[napi(object)]
pub struct JsBlockContext {
    pub commit_key: JsCommitKey,
    pub gas_limit: JsBigInt,
    pub timestamp: JsBigInt,
    pub validator_address: JsString,
}

#[napi(object)]
pub struct JsAccountUpdateContext {
    pub commit_key: JsCommitKey,
    pub account: JsString,
    pub nonce: JsBigInt,
}

#[napi(object)]
pub struct JsCommitKey {
    pub height: JsBigInt,
    pub round: JsBigInt,
}

#[derive(Debug)]
pub struct TxContext {
    pub caller: Address,
    /// Omit recipient when deploying a contract
    pub recipient: Option<Address>,
    pub gas_limit: u64,
    pub data: Bytes,
    pub tx_hash: B256,
    pub block_context: BlockContext,
    pub spec_id: SpecId,
}

#[derive(Debug)]
pub struct TxViewContext {
    pub caller: Address,
    pub recipient: Address,
    pub data: Bytes,
    pub spec_id: SpecId,
}

#[derive(Debug)]
pub struct BlockContext {
    pub commit_key: CommitKey,
    pub gas_limit: U256,
    pub timestamp: U256,
    pub validator_address: Address,
}

#[derive(Debug)]
pub struct AccountUpdateContext {
    pub commit_key: CommitKey,
    pub account: Address,
    pub nonce: u64,
}

#[derive(Debug)]
pub struct ExecutionContext {
    pub caller: Address,
    pub recipient: Option<Address>,
    pub gas_limit: Option<u64>,
    pub data: Bytes,
    pub tx_hash: Option<B256>,
    pub block_context: Option<BlockContext>,
    pub spec_id: SpecId,
}

impl From<TxViewContext> for ExecutionContext {
    fn from(value: TxViewContext) -> Self {
        Self {
            caller: value.caller,
            recipient: Some(value.recipient),
            gas_limit: None,
            data: value.data,
            tx_hash: None,
            block_context: None,
            spec_id: value.spec_id,
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
            tx_hash: Some(value.tx_hash),
            block_context: Some(value.block_context),
            spec_id: value.spec_id,
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
            tx_hash: B256::try_from(
                &Bytes::from_str(value.tx_hash.into_utf8()?.as_str()?)?.as_ref()[..],
            )?,
            block_context: value.block_context.try_into()?,
            spec_id: parse_spec_id(value.spec_id)?,
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
            spec_id: parse_spec_id(value.spec_id)?,
        };

        Ok(tx_ctx)
    }
}

impl TryFrom<JsAccountUpdateContext> for AccountUpdateContext {
    type Error = anyhow::Error;

    fn try_from(value: JsAccountUpdateContext) -> Result<Self, Self::Error> {
        Ok(AccountUpdateContext {
            commit_key: value.commit_key.try_into()?,
            account: utils::create_address_from_js_string(value.account)?,
            nonce: value.nonce.get_u64()?.0,
        })
    }
}

fn parse_spec_id(spec_id: JsString) -> Result<SpecId, anyhow::Error> {
    let spec_id = spec_id.into_utf8()?.into_owned()?;

    // By default "Latest" also includes unreleased specs, hence pin it to a specific spec which we
    // can change manually as needed.
    if spec_id == "Latest" {
        return Ok(SpecId::SHANGHAI);
    }

    // Any supported spec is listed in the first match arm
    let spec_id = spec_id.as_str().into();
    match spec_id {
        SpecId::SHANGHAI => Ok(spec_id),
        _ => Err(anyhow::anyhow!("invalid spec_id")),
    }
}
