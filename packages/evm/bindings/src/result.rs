use mainsail_evm_core::{
    account::AccountInfoExtended,
    legacy::{LegacyAccountAttributes, LegacyColdWallet, LegacyMultiSignatureAttribute},
    receipt::TxReceipt,
    state_changes::AccountUpdate,
};
use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;
use revm::{
    primitives::{B256, Bytes},
    state::AccountInfo,
};

use crate::utils;

#[napi(object)]
pub struct JsProcessResult {
    pub receipt: JsTransactionReceipt,
}
impl JsProcessResult {
    pub fn new(receipt: TxReceipt) -> Self {
        Self {
            receipt: JsTransactionReceipt::new(receipt),
        }
    }
}

#[napi(object)]
pub struct JsSimulateResult {
    pub receipt: JsTransactionReceipt,
}
impl JsSimulateResult {
    pub fn new(receipt: TxReceipt) -> Self {
        Self {
            receipt: JsTransactionReceipt::new(receipt),
        }
    }
}

#[napi(object, object_from_js = false)]
pub struct JsCommitResult {
    pub dirty_accounts: Vec<JsAccountUpdate>,
}

impl JsCommitResult {
    pub fn new(result: CommitResult) -> anyhow::Result<Self> {
        let mut dirty_accounts = Vec::with_capacity(result.dirty_accounts.len());
        for item in result.dirty_accounts {
            dirty_accounts.push(JsAccountUpdate::new(item));
        }

        Ok(Self { dirty_accounts })
    }
}

#[napi(object)]
pub struct JsViewResult {
    pub success: bool,
    pub output: Option<Buffer>,
}
impl JsViewResult {
    pub fn new(result: TxViewResult) -> anyhow::Result<Self> {
        Ok(Self {
            success: result.success,
            output: result.output.map(|o| utils::convert_bytes_to_js_buffer(o)),
        })
    }
}

#[napi(object)]
pub struct JsPreverifyTransactionResult {
    pub success: bool,
    pub initial_gas_used: BigInt,
    pub error: Option<String>,
}

impl JsPreverifyTransactionResult {
    pub fn new(result: PreverifyTxResult) -> Self {
        Self {
            success: result.success,
            initial_gas_used: result.initial_gas_used.into(),
            error: result.error,
        }
    }
}

#[napi(object)]
pub struct JsTransactionReceipt {
    pub block_number: Option<BigInt>,
    pub tx_hash: Option<String>,

    pub gas_used: BigInt,
    pub gas_refunded: BigInt,
    pub status: u8,
    pub contract_address: Option<String>,

    pub logs: serde_json::Value,
    pub output: Option<Buffer>,
}

#[derive(Default)]
pub struct CommitResult {
    pub dirty_accounts: Vec<AccountUpdate>,
}

pub struct TxViewResult {
    pub success: bool,
    pub output: Option<Bytes>,
}

#[derive(Default)]
pub struct PreverifyTxResult {
    pub success: bool,
    pub initial_gas_used: u64,
    pub error: Option<String>,
}

impl JsTransactionReceipt {
    pub fn new(receipt: TxReceipt) -> Self {
        JsTransactionReceipt {
            gas_used: receipt.gas_used.into(),
            gas_refunded: receipt.gas_refunded.into(),
            status: receipt.success as u8,
            contract_address: receipt.contract_address,
            logs: receipt
                .logs
                .map(|l| serde_json::to_value(l).unwrap())
                .unwrap_or_else(|| serde_json::Value::Null), // TODO: check if null is correct
            output: receipt.output.map(|o| utils::convert_bytes_to_js_buffer(o)),
            block_number: None,
            tx_hash: None,
        }
    }
}

#[napi(object)]
pub struct JsAccountInfo {
    pub balance: BigInt,
    pub nonce: BigInt,
}

impl JsAccountInfo {
    pub fn new(account_info: AccountInfo) -> anyhow::Result<Self> {
        Ok(JsAccountInfo {
            nonce: account_info.nonce.into(),
            balance: utils::convert_u256_to_bigint(account_info.balance),
        })
    }
}

impl TryInto<AccountInfo> for JsAccountInfo {
    type Error = anyhow::Error;

    fn try_into(self) -> Result<AccountInfo, Self::Error> {
        Ok(AccountInfo {
            balance: utils::convert_bigint_to_u256(self.balance)?,
            nonce: self.nonce.get_u64().1,
            ..Default::default()
        })
    }
}

#[napi(object)]
pub struct JsAccountUpdate {
    pub address: String,
    pub balance: BigInt,
    pub nonce: BigInt,
    pub vote: Option<String>,
    pub unvote: Option<String>,
    pub username: Option<String>,
    pub username_resigned: bool,
    pub legacy_merge_info: Option<JsAccountMergeInfo>,
}

impl JsAccountUpdate {
    pub fn new(account_update: AccountUpdate) -> Self {
        let vote = account_update.vote.map(|vote| vote.to_string());
        let unvote = account_update.unvote.map(|unvote| unvote.to_string());
        let username = account_update.username.map(|username| username.to_string());

        let legacy_merge_info = match &account_update.merge_info {
            Some(legacy_merge_info) => Some(JsAccountMergeInfo {
                address: legacy_merge_info.legacy_address.to_string(),
                tx_hash: legacy_merge_info.transaction_hash.to_string(),
            }),
            None => None,
        };

        JsAccountUpdate {
            address: account_update.address.to_checksum(None),
            nonce: account_update.nonce.into(),
            balance: utils::convert_u256_to_bigint(account_update.balance),
            vote,
            unvote,
            username,
            username_resigned: account_update.username_resigned,
            legacy_merge_info,
        }
    }
}

#[napi(object)]
pub struct JsAccountInfoExtended {
    pub address: String,
    pub balance: BigInt,
    pub nonce: BigInt,
    pub legacy_attributes: JsLegacyAttributes,
}

#[napi(object)]
pub struct JsLegacyColdWallet {
    pub address: String,
    pub balance: BigInt,
    pub legacy_attributes: JsLegacyAttributes,
    pub merge_info: Option<JsAccountMergeInfo>,
}

#[napi(object)]
pub struct JsAccountMergeInfo {
    pub address: String,
    pub tx_hash: String,
}

impl JsLegacyColdWallet {
    pub fn new(wallet: LegacyColdWallet) -> Self {
        let merge_info = if let Some(merged_account) = wallet.merge_info {
            Some(JsAccountMergeInfo {
                address: merged_account.1.to_string(),
                tx_hash: merged_account.0.to_string(),
            })
        } else {
            None
        };

        JsLegacyColdWallet {
            address: wallet.address.to_string(),
            balance: utils::convert_u256_to_bigint(wallet.balance),
            legacy_attributes: JsLegacyAttributes::new(wallet.legacy_attributes),
            merge_info,
        }
    }
}

#[napi(object)]
pub struct JsLegacyAttributes {
    pub legacy_nonce: Option<BigInt>,
    pub second_public_key: Option<String>,
    pub multi_signature: Option<JsLegacyMultiSignatureAttribute>,
}

#[napi(object)]
pub struct JsLegacyMultiSignatureAttribute {
    pub min: u32,
    pub public_keys: Vec<String>,
}

impl JsAccountInfoExtended {
    pub fn new(account_info_extended: AccountInfoExtended) -> Self {
        JsAccountInfoExtended {
            address: account_info_extended.address.to_string(),
            nonce: account_info_extended.info.nonce.into(),
            balance: utils::convert_u256_to_bigint(account_info_extended.info.balance),
            legacy_attributes: JsLegacyAttributes::new(account_info_extended.legacy_attributes),
        }
    }
}

impl TryInto<AccountInfoExtended> for JsAccountInfoExtended {
    type Error = crate::Error;

    fn try_into(self) -> Result<AccountInfoExtended, Self::Error> {
        Ok(AccountInfoExtended {
            address: utils::create_address_from_string(&self.address)?,
            info: AccountInfo {
                balance: utils::convert_bigint_to_u256(self.balance)?,
                nonce: self.nonce.get_u64().1,
                ..Default::default()
            },
            legacy_attributes: self.legacy_attributes.try_into()?,
        })
    }
}

impl TryInto<LegacyColdWallet> for JsLegacyColdWallet {
    type Error = crate::Error;

    fn try_into(self) -> Result<LegacyColdWallet, Self::Error> {
        let merge_info = if let Some(merge_info) = self.merge_info {
            Some((
                utils::convert_string_to_b256(merge_info.tx_hash)?,
                utils::create_address_from_string(&merge_info.address)?,
            ))
        } else {
            None
        };

        Ok(LegacyColdWallet {
            address: utils::create_legacy_address_from_string(&self.address)?,
            balance: utils::convert_bigint_to_u256(self.balance)?,
            legacy_attributes: self.legacy_attributes.try_into()?,
            merge_info,
        })
    }
}

impl JsLegacyAttributes {
    pub fn new(legacy_attributes: LegacyAccountAttributes) -> Self {
        let multi_signature = if let Some(multi_signature) = legacy_attributes.multi_signature {
            Some(JsLegacyMultiSignatureAttribute {
                min: multi_signature.min as u32,
                public_keys: multi_signature.public_keys,
            })
        } else {
            None
        };

        JsLegacyAttributes {
            legacy_nonce: legacy_attributes.legacy_nonce.map(|nonce| nonce.into()),
            second_public_key: legacy_attributes.second_public_key,
            multi_signature,
        }
    }
}

impl Into<LegacyAccountAttributes> for JsLegacyAttributes {
    fn into(self) -> LegacyAccountAttributes {
        LegacyAccountAttributes {
            legacy_nonce: self.legacy_nonce.map(|nonce| nonce.get_u64().1),
            second_public_key: self.second_public_key,
            multi_signature: self.multi_signature.map(Into::into),
        }
    }
}

impl Into<LegacyMultiSignatureAttribute> for JsLegacyMultiSignatureAttribute {
    fn into(self) -> LegacyMultiSignatureAttribute {
        LegacyMultiSignatureAttribute {
            min: self.min as usize,
            public_keys: self.public_keys,
        }
    }
}

#[napi(object)]
pub struct JsGetAccounts {
    pub next_offset: Option<BigInt>,
    pub accounts: Vec<JsAccountInfoExtended>,
}

impl JsGetAccounts {
    pub fn new(next_offset: Option<u64>, accounts: Vec<AccountInfoExtended>) -> Self {
        let next_offset = match next_offset {
            Some(next_offset) => Some(next_offset.into()),
            None => None,
        };

        let mut mapped = Vec::with_capacity(accounts.len());
        for account in accounts {
            mapped.push(JsAccountInfoExtended::new(account));
        }

        JsGetAccounts {
            next_offset,
            accounts: mapped,
        }
    }
}

#[napi(object)]
pub struct JsGetLegacyColdWallets {
    pub next_offset: Option<BigInt>,
    pub wallets: Vec<JsLegacyColdWallet>,
}

impl JsGetLegacyColdWallets {
    pub fn new(next_offset: Option<u64>, wallets: Vec<LegacyColdWallet>) -> Self {
        let next_offset = match next_offset {
            Some(next_offset) => Some(next_offset.into()),
            None => None,
        };

        let mut mapped = Vec::with_capacity(wallets.len());
        for wallet in wallets {
            mapped.push(JsLegacyColdWallet::new(wallet));
        }

        JsGetLegacyColdWallets {
            next_offset,
            wallets: mapped,
        }
    }
}

#[napi(object)]
pub struct JsGetReceipts {
    pub next_offset: Option<BigInt>,
    pub receipts: Vec<JsTransactionReceipt>,
}

impl JsGetReceipts {
    pub fn new(
        next_offset: Option<u64>,
        receipts_by_block_number: Vec<(u64, Vec<(B256, TxReceipt)>)>,
    ) -> anyhow::Result<Self> {
        let next_offset = match next_offset {
            Some(next_offset) => Some(next_offset.into()),
            None => None,
        };

        let mut mapped = vec![];
        for (block_number, tx_receipts) in receipts_by_block_number {
            for (hash, tx_receipt) in tx_receipts {
                let mut receipt = JsTransactionReceipt::new(tx_receipt);

                receipt.block_number = Some(block_number.into());
                receipt.tx_hash = Some(format!("{:x}", hash));

                mapped.push(receipt);
            }
        }

        Ok(JsGetReceipts {
            next_offset,
            receipts: mapped,
        })
    }
}

#[napi(object)]
pub struct JsGetReceipt {
    pub receipt: Option<JsTransactionReceipt>,
}

impl JsGetReceipt {
    pub fn new(receipt: Option<TxReceipt>, block_number: u64, tx_hash: B256) -> Self {
        let receipt = match receipt {
            Some(receipt) => {
                let mut receipt = JsTransactionReceipt::new(receipt);
                receipt.block_number = Some(block_number.into());
                receipt.tx_hash = Some(tx_hash.to_string());

                Some(receipt)
            }
            None => None,
        };

        JsGetReceipt { receipt }
    }
}

#[napi(object)]
pub struct JsGetState {
    pub block_number: BigInt,
    pub total_round: BigInt,
}

impl JsGetState {
    pub fn new(state: (u64, u64)) -> Self {
        JsGetState {
            block_number: state.0.into(),
            total_round: state.1.into(),
        }
    }
}
