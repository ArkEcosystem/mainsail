use std::{path::PathBuf, str::FromStr};

use mainsail_evm_core::{
    db::{CommitData, CommitKey},
    legacy::LegacyAddress,
};
use napi::{JsBigInt, JsBuffer, JsFunction, JsNumber, JsString};
use napi_derive::napi;
use revm::primitives::{Address, B256, Bytes, U256, hardfork::SpecId};

use crate::utils;

#[napi(object)]
pub struct JsEvmOptions {
    pub path: JsString,
    pub logger: Option<JsFunction>,
    pub history_size: Option<JsBigInt>,
}

#[napi(object)]
pub struct JsTransactionContext {
    pub from: JsString,
    pub legacy_address: Option<JsString>,
    /// Omit recipient when deploying a contract
    pub to: Option<JsString>,
    pub gas_limit: JsBigInt,
    pub gas_price: JsBigInt,
    pub value: JsBigInt,
    pub nonce: JsBigInt,
    pub data: JsBuffer,
    pub tx_hash: JsString,
    pub index: Option<JsNumber>,
    pub block_context: JsBlockContext,
    pub spec_id: JsString,
}

#[napi(object)]
pub struct JsPreverifyTransactionContext {
    pub from: JsString,
    pub legacy_address: Option<JsString>,
    /// Omit recipient when deploying a contract
    pub to: Option<JsString>,
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
    pub from: JsString,
    pub to: JsString,
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
    pub initial_block_number: JsBigInt,
    pub initial_supply: JsBigInt,
}

#[napi(object)]
pub struct JsCalculateRoundValidatorsContext {
    pub commit_key: JsCommitKey,
    pub timestamp: JsBigInt,
    pub round_validators: JsBigInt,
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
    pub block_number: JsBigInt,
    pub round: JsBigInt,
    pub block_hash: Option<JsString>,
}

#[napi(object)]
pub struct JsCommitData {
    pub block_hash: JsString,
    pub block: JsBuffer,
    pub proof: JsBuffer,
    pub transaction_hashes: Vec<JsString>,
    pub transactions: Vec<JsBuffer>,
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
    pub from: Address,
    pub legacy_address: Option<LegacyAddress>,
    /// Omit recipient when deploying a contract
    pub to: Option<Address>,
    pub gas_limit: u64,
    pub gas_price: u128,
    pub value: U256,
    pub nonce: u64,
    pub data: Bytes,
    pub tx_hash: B256,
    pub spec_id: SpecId,
    pub block_gas_limit: u64,
}

#[derive(Debug)]
pub struct TxContext {
    pub from: Address,
    pub legacy_address: Option<LegacyAddress>,
    /// Omit recipient when deploying a contract
    pub to: Option<Address>,
    pub gas_limit: u64,
    pub gas_price: u128,
    pub value: U256,
    pub nonce: u64,
    pub data: Bytes,
    pub tx_hash: B256,
    pub index: Option<u32>,
    pub block_context: BlockContext,
    pub spec_id: SpecId,
}

#[derive(Debug)]
pub struct TxViewContext {
    pub from: Address,
    pub to: Address,
    pub data: Bytes,
    pub spec_id: SpecId,
    pub gas_limit: Option<u64>,
}

#[derive(Debug)]
pub struct BlockContext {
    pub commit_key: CommitKey,
    pub gas_limit: u64,
    pub timestamp: u64,
    pub validator_address: Address,
}

#[derive(Debug)]
pub struct GenesisContext {
    pub account: Address,
    pub deployer_account: Address,
    pub validator_contract: Address,
    pub username_contract: Address,
    pub initial_block_number: u64,
    pub initial_supply: U256,
}

#[derive(Debug)]
pub struct CalculateRoundValidatorsContext {
    pub commit_key: CommitKey,
    pub timestamp: u64,
    pub round_validators: u8,
    pub validator_address: Address,
    pub spec_id: SpecId,
}

#[derive(Debug)]
pub struct UpdateRewardsAndVotesContext {
    pub commit_key: CommitKey,
    pub timestamp: u64,
    pub block_reward: u128,
    pub validator_address: Address,
    pub spec_id: SpecId,
}

pub struct EvmOptions {
    pub path: PathBuf,
    pub logger_callback: Option<JsFunction>,
    pub history_size: Option<u64>,
}

#[derive(Debug)]
pub struct ExecutionContext {
    pub from: Address,
    pub to: Option<Address>,
    pub gas_limit: Option<u64>,
    pub gas_price: u128,
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
            from: value.from,
            to: Some(value.to),
            gas_limit: value.gas_limit,
            gas_price: 0,
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
            from: value.from,
            to: value.to,
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
        let block_hash = if let Some(block_hash) = value.block_hash {
            utils::convert_string_to_b256(block_hash)?
        } else {
            B256::ZERO
        };

        Ok(CommitKey(
            value.block_number.get_u64()?.0,
            value.round.get_u64()?.0,
            block_hash,
        ))
    }
}

impl TryFrom<JsCommitData> for CommitData {
    type Error = anyhow::Error;

    fn try_from(value: JsCommitData) -> Result<Self, Self::Error> {
        let proof = utils::convert_js_buffer_to_bytes(value.proof)?;
        let block = utils::convert_js_buffer_to_bytes(value.block)?;
        let block_hash = utils::convert_string_to_b256(value.block_hash)?;

        let mut transaction_hashes = Vec::with_capacity(value.transaction_hashes.len());
        for transaction_hash in value.transaction_hashes {
            transaction_hashes.push(utils::convert_string_to_b256(transaction_hash)?);
        }

        let mut transactions = Vec::with_capacity(value.transactions.len());
        for transaction in value.transactions {
            transactions.push(utils::convert_js_buffer_to_bytes(transaction)?);
        }

        assert_eq!(transaction_hashes.len(), transactions.len());

        Ok(CommitData {
            block_hash,
            block,
            proof,
            transaction_hashes,
            transactions,
        })
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
            gas_limit: value.gas_limit.get_u64()?.0,
            timestamp: value.timestamp.get_u64()?.0,
            validator_address: utils::create_address_from_js_string(value.validator_address)?,
        })
    }
}

impl TryFrom<JsTransactionContext> for TxContext {
    type Error = anyhow::Error;

    fn try_from(mut value: JsTransactionContext) -> std::result::Result<Self, Self::Error> {
        let buf = value.data.into_value()?;

        let to = if let Some(to) = value.to {
            Some(utils::create_address_from_js_string(to)?)
        } else {
            None
        };

        let legacy_address = if let Some(legacy_address) = value.legacy_address {
            Some(utils::create_legacy_address_from_js_string(legacy_address)?)
        } else {
            None
        };

        let index = if let Some(index) = value.index {
            Some(index.get_uint32()?)
        } else {
            None
        };

        let tx_ctx = TxContext {
            to,
            gas_limit: value.gas_limit.try_into()?,
            gas_price: value.gas_price.get_u128()?.1,
            from: utils::create_address_from_js_string(value.from)?,
            legacy_address,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64()?.0,
            data: Bytes::from(buf.as_ref().to_owned()),
            tx_hash: utils::convert_string_to_b256(value.tx_hash)?,
            index,
            block_context: value.block_context.try_into()?,
            spec_id: parse_spec_id(value.spec_id)?,
        };

        Ok(tx_ctx)
    }
}

impl TryFrom<JsPreverifyTransactionContext> for PreverifyTxContext {
    type Error = anyhow::Error;

    fn try_from(
        mut value: JsPreverifyTransactionContext,
    ) -> std::result::Result<Self, Self::Error> {
        let buf = value.data.into_value()?;

        let to = if let Some(to) = value.to {
            Some(utils::create_address_from_js_string(to)?)
        } else {
            None
        };

        let legacy_address = if let Some(legacy_address) = value.legacy_address {
            Some(utils::create_legacy_address_from_js_string(legacy_address)?)
        } else {
            None
        };

        let tx_ctx = PreverifyTxContext {
            to,
            gas_limit: value.gas_limit.try_into()?,
            gas_price: value.gas_price.get_u128()?.1,
            from: utils::create_address_from_js_string(value.from)?,
            legacy_address,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64()?.0,
            data: Bytes::from(buf.as_ref().to_owned()),
            tx_hash: utils::convert_string_to_b256(value.tx_hash)?,
            block_gas_limit: value.block_gas_limit.get_u64()?.0,
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
            from: utils::create_address_from_js_string(value.from)?,
            to: utils::create_address_from_js_string(value.to)?,
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
            initial_block_number: value.initial_block_number.get_u64()?.0,
            initial_supply: utils::convert_bigint_to_u256(value.initial_supply)?,
        })
    }
}

impl TryFrom<JsEvmOptions> for EvmOptions {
    type Error = anyhow::Error;

    fn try_from(value: JsEvmOptions) -> Result<Self, Self::Error> {
        let history_size = if let Some(history_size) = value.history_size {
            Some(history_size.get_u64()?.0)
        } else {
            None
        };

        Ok(EvmOptions {
            path: value.path.into_utf8()?.into_owned()?.into(),
            logger_callback: value.logger,
            history_size,
        })
    }
}

impl TryFrom<JsCalculateRoundValidatorsContext> for CalculateRoundValidatorsContext {
    type Error = anyhow::Error;

    fn try_from(value: JsCalculateRoundValidatorsContext) -> Result<Self, Self::Error> {
        Ok(CalculateRoundValidatorsContext {
            commit_key: value.commit_key.try_into()?,
            timestamp: value.timestamp.get_u64()?.0,
            validator_address: utils::create_address_from_js_string(value.validator_address)?,
            round_validators: u8::try_from(match value.round_validators.get_u64() {
                Ok(round_validators) => round_validators.0,
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
            timestamp: value.timestamp.get_u64()?.0,
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
    match SpecId::from_str(spec_id.as_str()) {
        Ok(spec_id) => match spec_id {
            SpecId::SHANGHAI => Ok(spec_id),
            _ => Err(anyhow::anyhow!("unsupported spec_id")),
        },
        _ => Err(anyhow::anyhow!("invalid spec_id")),
    }
}
