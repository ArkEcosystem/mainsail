use std::str::FromStr;

use mainsail_evm_core::{db::CommitKey, legacy::LegacyAddress};
use napi::{JsBigInt, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{Address, Bytes, SpecId, B256, U256};

use crate::utils;

#[napi(object)]
pub struct JsTransactionContext {
    pub caller: JsString,
    pub legacy_address: Option<JsString>,
    /// Omit recipient when deploying a contract
    pub recipient: Option<JsString>,
    pub gas_limit: JsBigInt,
    pub gas_price: JsBigInt,
    pub value: JsBigInt,
    pub nonce: JsBigInt,
    pub data: JsBuffer,
    pub tx_hash: JsString,
    pub block_context: JsBlockContext,
    pub spec_id: JsString,
}

#[napi(object)]
pub struct JsPreverifyTransactionContext {
    pub caller: JsString,
    pub legacy_address: Option<JsString>,
    /// Omit recipient when deploying a contract
    pub recipient: Option<JsString>,
    pub gas_limit: JsBigInt,
    pub gas_price: JsBigInt,
    pub value: JsBigInt,
    pub nonce: JsBigInt,
    pub data: JsBuffer,
    pub tx_hash: JsString,
    pub spec_id: JsString,
    pub block_gas_limit: JsBigInt,
}

#[napi(object)]
pub struct JsTransactionViewContext {
    pub caller: JsString,
    pub recipient: JsString,
    pub data: JsBuffer,
    pub spec_id: JsString,
    pub gas_limit: Option<JsBigInt>,
}

#[napi(object)]
pub struct JsBlockContext {
    pub commit_key: JsCommitKey,
    pub gas_limit: JsBigInt,
    pub timestamp: JsBigInt,
    pub validator_address: JsString,
}

#[napi(object)]
pub struct JsGenesisContext {
    pub account: JsString,
    pub deployer_account: JsString,
    pub validator_contract: JsString,
    pub username_contract: JsString,
    pub initial_supply: JsBigInt,
}

#[napi(object)]
pub struct JsCalculateActiveValidatorsContext {
    pub commit_key: JsCommitKey,
    pub timestamp: JsBigInt,
    pub active_validators: JsBigInt,
    pub validator_address: JsString,
    pub spec_id: JsString,
}

#[napi(object)]
pub struct JsUpdateRewardsAndVotesContext {
    pub commit_key: JsCommitKey,
    pub timestamp: JsBigInt,
    pub block_reward: JsBigInt,
    pub validator_address: JsString,
    pub spec_id: JsString,
}

#[napi(object)]
pub struct JsCommitKey {
    pub height: JsBigInt,
    pub round: JsBigInt,
}

#[napi(object)]
pub struct JsPrepareNextCommitContext {
    pub commit_key: JsCommitKey,
}

#[derive(Debug)]
pub struct PrepareNextCommitContext {
    pub commit_key: CommitKey,
}

#[derive(Debug)]
pub struct PreverifyTxContext {
    pub caller: Address,
    pub legacy_address: Option<LegacyAddress>,
    /// Omit recipient when deploying a contract
    pub recipient: Option<Address>,
    pub gas_limit: u64,
    pub gas_price: U256,
    pub value: U256,
    pub nonce: u64,
    pub data: Bytes,
    pub tx_hash: B256,
    pub spec_id: SpecId,
    pub block_gas_limit: U256,
}

#[derive(Debug)]
pub struct TxContext {
    pub caller: Address,
    pub legacy_address: Option<LegacyAddress>,
    /// Omit recipient when deploying a contract
    pub recipient: Option<Address>,
    pub gas_limit: u64,
    pub gas_price: U256,
    pub value: U256,
    pub nonce: u64,
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
    pub gas_limit: Option<u64>,
}

#[derive(Debug)]
pub struct BlockContext {
    pub commit_key: CommitKey,
    pub gas_limit: U256,
    pub timestamp: U256,
    pub validator_address: Address,
}

#[derive(Debug)]
pub struct GenesisContext {
    pub account: Address,
    pub deployer_account: Address,
    pub validator_contract: Address,
    pub username_contract: Address,
    pub initial_supply: U256,
}

#[derive(Debug)]
pub struct CalculateActiveValidatorsContext {
    pub commit_key: CommitKey,
    pub timestamp: U256,
    pub active_validators: u8,
    pub validator_address: Address,
    pub spec_id: SpecId,
}

#[derive(Debug)]
pub struct UpdateRewardsAndVotesContext {
    pub commit_key: CommitKey,
    pub timestamp: U256,
    pub block_reward: u128,
    pub validator_address: Address,
    pub spec_id: SpecId,
}

#[derive(Debug)]
pub struct ExecutionContext {
    pub caller: Address,
    pub recipient: Option<Address>,
    pub gas_limit: Option<u64>,
    pub gas_price: U256,
    pub value: U256,
    pub nonce: Option<u64>,
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
            gas_limit: value.gas_limit,
            gas_price: U256::ZERO,
            value: U256::ZERO,
            nonce: None,
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
            gas_price: value.gas_price,
            value: value.value,
            nonce: Some(value.nonce),
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

impl TryFrom<JsPrepareNextCommitContext> for PrepareNextCommitContext {
    type Error = anyhow::Error;

    fn try_from(value: JsPrepareNextCommitContext) -> Result<Self, Self::Error> {
        Ok(PrepareNextCommitContext {
            commit_key: value.commit_key.try_into()?,
        })
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

        let legacy_address = if let Some(legacy_address) = value.legacy_address {
            Some(utils::create_legacy_address_from_js_string(legacy_address)?)
        } else {
            None
        };

        let tx_ctx = TxContext {
            recipient,
            gas_limit: value.gas_limit.try_into()?,
            gas_price: utils::convert_bigint_to_u256(value.gas_price)?,
            caller: utils::create_address_from_js_string(value.caller)?,
            legacy_address,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64()?.0,
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

impl TryFrom<JsPreverifyTransactionContext> for PreverifyTxContext {
    type Error = anyhow::Error;

    fn try_from(value: JsPreverifyTransactionContext) -> std::result::Result<Self, Self::Error> {
        let buf = value.data.into_value()?;

        let recipient = if let Some(recipient) = value.recipient {
            Some(utils::create_address_from_js_string(recipient)?)
        } else {
            None
        };

        let legacy_address = if let Some(legacy_address) = value.legacy_address {
            Some(utils::create_legacy_address_from_js_string(legacy_address)?)
        } else {
            None
        };

        let tx_ctx = PreverifyTxContext {
            recipient,
            gas_limit: value.gas_limit.try_into()?,
            gas_price: utils::convert_bigint_to_u256(value.gas_price)?,
            caller: utils::create_address_from_js_string(value.caller)?,
            legacy_address,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64()?.0,
            data: Bytes::from(buf.as_ref().to_owned()),
            tx_hash: B256::try_from(
                &Bytes::from_str(value.tx_hash.into_utf8()?.as_str()?)?.as_ref()[..],
            )?,
            block_gas_limit: utils::convert_bigint_to_u256(value.block_gas_limit)?,
            spec_id: parse_spec_id(value.spec_id)?,
        };

        Ok(tx_ctx)
    }
}

impl TryFrom<JsTransactionViewContext> for TxViewContext {
    type Error = anyhow::Error;

    fn try_from(value: JsTransactionViewContext) -> std::result::Result<Self, Self::Error> {
        let buf = value.data.into_value()?;

        let gas_limit = if let Some(gas_limit) = value.gas_limit {
            Some(gas_limit.get_u64()?.0)
        } else {
            None
        };

        let tx_ctx = TxViewContext {
            caller: utils::create_address_from_js_string(value.caller)?,
            recipient: utils::create_address_from_js_string(value.recipient)?,
            data: Bytes::from(buf.as_ref().to_owned()),
            spec_id: parse_spec_id(value.spec_id)?,
            gas_limit,
        };

        Ok(tx_ctx)
    }
}

impl TryFrom<JsGenesisContext> for GenesisContext {
    type Error = anyhow::Error;

    fn try_from(value: JsGenesisContext) -> Result<Self, Self::Error> {
        Ok(GenesisContext {
            account: utils::create_address_from_js_string(value.account)?,
            validator_contract: utils::create_address_from_js_string(value.validator_contract)?,
            username_contract: utils::create_address_from_js_string(value.username_contract)?,
            deployer_account: utils::create_address_from_js_string(value.deployer_account)?,
            initial_supply: utils::convert_bigint_to_u256(value.initial_supply)?,
        })
    }
}

impl TryFrom<JsCalculateActiveValidatorsContext> for CalculateActiveValidatorsContext {
    type Error = anyhow::Error;

    fn try_from(value: JsCalculateActiveValidatorsContext) -> Result<Self, Self::Error> {
        Ok(CalculateActiveValidatorsContext {
            commit_key: value.commit_key.try_into()?,
            timestamp: U256::from(value.timestamp.get_u64()?.0),
            validator_address: utils::create_address_from_js_string(value.validator_address)?,
            active_validators: u8::try_from(match value.active_validators.get_u64() {
                Ok(active_validators) => active_validators.0,
                Err(_) => 0 as u64,
            })?,
            spec_id: parse_spec_id(value.spec_id)?,
        })
    }
}

impl TryFrom<JsUpdateRewardsAndVotesContext> for UpdateRewardsAndVotesContext {
    type Error = anyhow::Error;

    fn try_from(mut value: JsUpdateRewardsAndVotesContext) -> Result<Self, Self::Error> {
        Ok(UpdateRewardsAndVotesContext {
            commit_key: value.commit_key.try_into()?,
            timestamp: U256::from(value.timestamp.get_u64()?.0),
            validator_address: utils::create_address_from_js_string(value.validator_address)?,
            block_reward: value.block_reward.get_u128()?.1,
            spec_id: parse_spec_id(value.spec_id)?,
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
