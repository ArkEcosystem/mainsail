use std::{path::PathBuf, str::FromStr};

use mainsail_evm_core::{
    db::{BlockHeaderData, CommitData, CommitKey, ProofData, TransactionData},
    legacy::LegacyAddress,
};
use napi::bindgen_prelude::{BigInt, Buffer, Function};
use napi_derive::napi;
use revm::primitives::{Address, B256, Bytes, U256, alloy_primitives::Bloom, hardfork::SpecId};

use crate::{logger::JsLogMessage, utils};

#[napi(object)]
pub struct JsEvmOptions {
    pub path: String,
    pub logger: Option<Function<'static, JsLogMessage, ()>>,
    pub history_size: Option<BigInt>,
}

#[napi(object)]
pub struct JsTransactionContext {
    pub from: String,
    pub legacy_address: Option<String>,
    /// Omit recipient when deploying a contract
    pub to: Option<String>,
    pub gas_limit: BigInt,
    pub gas_price: BigInt,
    pub value: BigInt,
    pub nonce: BigInt,
    pub data: Buffer,
    pub tx_hash: String,
    pub index: Option<u32>,
    pub block_context: JsBlockContext,
    pub spec_id: String,
}

#[napi(object)]
pub struct JsTransactionSimulateContext {
    pub from: String,
    /// Omit recipient when deploying a contract
    pub to: Option<String>,
    pub gas_limit: BigInt,
    pub gas_price: BigInt,
    pub value: BigInt,
    pub nonce: BigInt,
    pub data: Buffer,
    pub block_context: JsBlockContext,
    pub spec_id: String,
}

#[napi(object)]
pub struct JsPreverifyTransactionContext {
    pub from: String,
    pub legacy_address: Option<String>,
    /// Omit recipient when deploying a contract
    pub to: Option<String>,
    pub gas_limit: BigInt,
    pub gas_price: BigInt,
    pub value: BigInt,
    pub nonce: BigInt,
    pub data: Buffer,
    pub tx_hash: String,
    pub spec_id: String,
    pub block_gas_limit: BigInt,
}

#[napi(object)]
pub struct JsTransactionViewContext {
    pub from: String,
    pub to: String,
    pub data: Buffer,
    pub spec_id: String,
    pub gas_limit: Option<BigInt>,
}

#[napi(object)]
pub struct JsBlockContext {
    pub commit_key: JsCommitKey,
    pub gas_limit: BigInt,
    pub timestamp: BigInt,
    pub validator_address: String,
}

#[napi(object)]
pub struct JsGenesisContext {
    pub account: String,
    pub deployer_account: String,
    pub validator_contract: String,
    pub username_contract: String,
    pub initial_block_number: BigInt,
    pub initial_supply: BigInt,
}

#[napi(object)]
pub struct JsCalculateRoundValidatorsContext {
    pub commit_key: JsCommitKey,
    pub timestamp: BigInt,
    pub round_validators: BigInt,
    pub validator_address: String,
    pub spec_id: String,
}

#[napi(object)]
pub struct JsUpdateRewardsAndVotesContext {
    pub commit_key: JsCommitKey,
    pub timestamp: BigInt,
    pub block_reward: BigInt,
    pub validator_address: String,
    pub spec_id: String,
}

#[napi(object)]
pub struct JsProofData {
    pub round: u32,
    pub signature: String,
    pub validator_set: BigInt,
}

#[napi(object)]
pub struct JsBlockHeaderData {
    pub version: u8,
    pub timestamp: BigInt,
    pub number: u32,
    pub round: u32,
    pub hash: String,
    pub parent_hash: String,
    pub state_root: String,
    pub logs_bloom: String,
    pub transactions_root: String,
    pub transactions_count: u16,
    pub gas_used: u32,
    pub fee: BigInt,
    pub reward: BigInt,
    pub payload_size: u32,
    pub proposer: String,
}

#[napi(object)]
pub struct JsTransactionData {
    pub from: String,
    pub sender_public_key: String,
    pub legacy_address: Option<String>,
    pub to: Option<String>,
    pub gas_limit: BigInt,
    pub gas_price: BigInt,
    pub value: BigInt,
    pub nonce: BigInt,
    pub data: Buffer,
    pub v: u32,
    pub r: String,
    pub s: String,
    pub legacy_second_signature: Option<String>,
    pub tx_hash: String,
    pub block_number: u32,
    pub index: u32,
}

#[napi(object)]
pub struct JsCommitKey {
    pub block_number: BigInt,
    pub round: BigInt,
    pub block_hash: Option<String>,
}

#[napi(object)]
pub struct JsCommitData {
    pub proof: JsProofData,
    pub header: JsBlockHeaderData,
    pub transactions: Vec<JsTransactionData>,
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
pub struct TxSimulateContext {
    pub from: Address,
    pub to: Option<Address>,
    pub gas_limit: u64,
    pub gas_price: u128,
    pub value: U256,
    pub nonce: u64,
    pub data: Bytes,
    pub block_context: BlockContext,
    pub spec_id: SpecId,
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
    pub logger_callback: Option<Function<'static, JsLogMessage, ()>>,
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
    pub stateful: bool,
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
            stateful: false,
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
            stateful: true,
        }
    }
}

impl From<TxSimulateContext> for ExecutionContext {
    fn from(value: TxSimulateContext) -> Self {
        Self {
            from: value.from,
            to: value.to,
            gas_limit: Some(value.gas_limit),
            gas_price: value.gas_price,
            value: value.value,
            nonce: Some(value.nonce),
            data: value.data,
            tx_hash: None,
            block_context: Some(value.block_context),
            spec_id: value.spec_id,
            stateful: false,
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
            value.block_number.get_u64().1,
            value.round.get_u64().1,
            block_hash,
        ))
    }
}

impl TryFrom<JsProofData> for ProofData {
    type Error = anyhow::Error;

    fn try_from(value: JsProofData) -> Result<Self, Self::Error> {
        Ok(ProofData {
            round: value.round,
            signature: utils::convert_string_to_bls_sig(value.signature)?,
            validator_set: value.validator_set.get_u128().1,
        })
    }
}

impl TryFrom<JsBlockHeaderData> for BlockHeaderData {
    type Error = anyhow::Error;

    fn try_from(value: JsBlockHeaderData) -> Result<Self, Self::Error> {
        Ok(BlockHeaderData {
            proposer: utils::create_address_from_string(&value.proposer)?,
            version: value.version,
            timestamp: value.timestamp.get_u64().1,
            number: value.number,
            round: value.round,
            hash: utils::convert_string_to_b256(value.hash)?,
            parent_hash: utils::convert_string_to_b256(value.parent_hash)?,
            state_root: utils::convert_string_to_b256(value.state_root)?,
            logs_bloom: Bloom::from_str(&value.logs_bloom)?,
            transactions_root: utils::convert_string_to_b256(value.transactions_root)?,
            transactions_count: value.transactions_count,
            gas_used: value.gas_used,
            fee: utils::convert_bigint_to_u256(value.fee)?,
            reward: utils::convert_bigint_to_u256(value.reward)?,
            payload_size: value.payload_size,
        })
    }
}

impl TryFrom<JsTransactionData> for TransactionData {
    type Error = anyhow::Error;

    fn try_from(value: JsTransactionData) -> Result<Self, Self::Error> {
        let to = if let Some(to) = value.to {
            Some(utils::create_address_from_string(&to)?)
        } else {
            None
        };

        let legacy_address = if let Some(legacy_address) = value.legacy_address {
            Some(utils::create_legacy_address_from_string(&legacy_address)?)
        } else {
            None
        };

        Ok(TransactionData {
            from: utils::create_address_from_string(&value.from)?,
            sender_public_key: value.sender_public_key,
            legacy_address,
            to,
            gas_limit: value.gas_limit.get_u64().1,
            gas_price: value.gas_price.get_u128().1,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64().1,
            data: utils::convert_js_buffer_to_bytes(value.data),
            tx_hash: utils::convert_string_to_b256(value.tx_hash)?,
            block_number: value.block_number,
            index: value.index,
            legacy_second_signature: None,
            v: value.v,
            r: utils::convert_hex_to_u256(&value.r),
            s: utils::convert_hex_to_u256(&value.s),
        })
    }
}

impl TryFrom<JsCommitData> for CommitData {
    type Error = anyhow::Error;

    fn try_from(value: JsCommitData) -> Result<Self, Self::Error> {
        let proof: ProofData = value.proof.try_into()?;
        let header: BlockHeaderData = value.header.try_into()?;

        let mut transactions = Vec::with_capacity(value.transactions.len());
        for data in value.transactions {
            transactions.push(data.try_into()?);
        }

        assert_eq!(header.transactions_count, transactions.len() as u16);

        Ok(CommitData {
            proof,
            header,
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
            gas_limit: value.gas_limit.get_u64().1,
            timestamp: value.timestamp.get_u64().1,
            validator_address: utils::create_address_from_string(&value.validator_address)?,
        })
    }
}

impl TryFrom<JsTransactionContext> for TxContext {
    type Error = anyhow::Error;

    fn try_from(value: JsTransactionContext) -> std::result::Result<Self, Self::Error> {
        let to = if let Some(to) = value.to {
            Some(utils::create_address_from_string(&to)?)
        } else {
            None
        };

        let legacy_address = if let Some(legacy_address) = value.legacy_address {
            Some(utils::create_legacy_address_from_string(&legacy_address)?)
        } else {
            None
        };

        let tx_ctx = TxContext {
            to,
            gas_limit: value.gas_limit.get_u64().1,
            gas_price: value.gas_price.get_u128().1,
            from: utils::create_address_from_string(&value.from)?,
            legacy_address,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64().1,
            data: utils::convert_js_buffer_to_bytes(value.data),
            tx_hash: utils::convert_string_to_b256(value.tx_hash)?,
            index: value.index,
            block_context: value.block_context.try_into()?,
            spec_id: parse_spec_id(value.spec_id)?,
        };

        Ok(tx_ctx)
    }
}

impl TryFrom<JsTransactionSimulateContext> for TxSimulateContext {
    type Error = anyhow::Error;

    fn try_from(value: JsTransactionSimulateContext) -> std::result::Result<Self, Self::Error> {
        let to = if let Some(to) = value.to {
            Some(utils::create_address_from_string(&to)?)
        } else {
            None
        };

        Ok(TxSimulateContext {
            to,
            gas_limit: value.gas_limit.get_u64().1,
            gas_price: value.gas_price.get_u128().1,
            from: utils::create_address_from_string(&value.from)?,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64().1,
            data: utils::convert_js_buffer_to_bytes(value.data),
            block_context: value.block_context.try_into()?,
            spec_id: parse_spec_id(value.spec_id)?,
        })
    }
}

impl TryFrom<JsPreverifyTransactionContext> for PreverifyTxContext {
    type Error = anyhow::Error;

    fn try_from(value: JsPreverifyTransactionContext) -> std::result::Result<Self, Self::Error> {
        let to = if let Some(to) = value.to {
            Some(utils::create_address_from_string(&to)?)
        } else {
            None
        };

        let legacy_address = if let Some(legacy_address) = value.legacy_address {
            Some(utils::create_legacy_address_from_string(&legacy_address)?)
        } else {
            None
        };

        let tx_ctx = PreverifyTxContext {
            to,
            gas_limit: value.gas_limit.get_u64().1,
            gas_price: value.gas_price.get_u128().1,
            from: utils::create_address_from_string(&value.from)?,
            legacy_address,
            value: utils::convert_bigint_to_u256(value.value)?,
            nonce: value.nonce.get_u64().1,
            data: utils::convert_js_buffer_to_bytes(value.data),
            tx_hash: utils::convert_string_to_b256(value.tx_hash)?,
            block_gas_limit: value.block_gas_limit.get_u64().1,
            spec_id: parse_spec_id(value.spec_id)?,
        };

        Ok(tx_ctx)
    }
}

impl TryFrom<JsTransactionViewContext> for TxViewContext {
    type Error = anyhow::Error;

    fn try_from(value: JsTransactionViewContext) -> std::result::Result<Self, Self::Error> {
        let gas_limit = value.gas_limit.map(|gas_limit| gas_limit.get_u64().1);

        let tx_ctx = TxViewContext {
            from: utils::create_address_from_string(&value.from)?,
            to: utils::create_address_from_string(&value.to)?,
            data: utils::convert_js_buffer_to_bytes(value.data),
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
            account: utils::create_address_from_string(&value.account)?,
            validator_contract: utils::create_address_from_string(&value.validator_contract)?,
            username_contract: utils::create_address_from_string(&value.username_contract)?,
            deployer_account: utils::create_address_from_string(&value.deployer_account)?,
            initial_block_number: value.initial_block_number.get_u64().1,
            initial_supply: utils::convert_bigint_to_u256(value.initial_supply)?,
        })
    }
}

impl TryFrom<JsEvmOptions> for EvmOptions {
    type Error = anyhow::Error;

    fn try_from(value: JsEvmOptions) -> Result<Self, Self::Error> {
        let history_size = value
            .history_size
            .map(|history_size| history_size.get_u64().1);

        Ok(EvmOptions {
            path: value.path.into(),
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
            timestamp: value.timestamp.get_u64().1,
            validator_address: utils::create_address_from_string(&value.validator_address)?,
            round_validators: u8::try_from(value.round_validators.get_u64().1)?,
            spec_id: parse_spec_id(value.spec_id)?,
        })
    }
}

impl TryFrom<JsUpdateRewardsAndVotesContext> for UpdateRewardsAndVotesContext {
    type Error = anyhow::Error;

    fn try_from(value: JsUpdateRewardsAndVotesContext) -> Result<Self, Self::Error> {
        Ok(UpdateRewardsAndVotesContext {
            commit_key: value.commit_key.try_into()?,
            timestamp: value.timestamp.get_u64().1,
            validator_address: utils::create_address_from_string(&value.validator_address)?,
            block_reward: value.block_reward.get_u128().1,
            spec_id: parse_spec_id(value.spec_id)?,
        })
    }
}

fn parse_spec_id(spec_id: String) -> Result<SpecId, anyhow::Error> {
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
