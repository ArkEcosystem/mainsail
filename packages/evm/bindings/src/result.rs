use mainsail_evm_core::{
    account::AccountInfoExtended,
    legacy::{LegacyAccountAttributes, LegacyColdWallet, LegacyMultiSignatureAttribute},
    receipt::TxReceipt,
    state_changes::AccountUpdate,
};
use napi::{JsBigInt, JsBoolean, JsBuffer, JsNumber, JsString};
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
    pub fn new(node_env: &napi::Env, receipt: TxReceipt) -> anyhow::Result<Self> {
        Ok(Self {
            receipt: JsTransactionReceipt::new(node_env, receipt)?,
        })
    }
}

#[napi(object)]
pub struct JsSimulateResult {
    pub receipt: JsTransactionReceipt,
}
impl JsSimulateResult {
    pub fn new(node_env: &napi::Env, receipt: TxReceipt) -> anyhow::Result<Self> {
        Ok(Self {
            receipt: JsTransactionReceipt::new(node_env, receipt)?,
        })
    }
}

#[napi(object)]
pub struct JsCommitResult {
    pub dirty_accounts: Vec<JsAccountUpdate>,
}

impl JsCommitResult {
    pub fn new(node_env: &napi::Env, result: CommitResult) -> anyhow::Result<Self> {
        let mut dirty_accounts = Vec::with_capacity(result.dirty_accounts.len());
        for item in result.dirty_accounts {
            dirty_accounts.push(JsAccountUpdate::new(node_env, item)?);
        }

        Ok(Self { dirty_accounts })
    }
}

#[napi(object)]
pub struct JsViewResult {
    pub success: bool,
    pub output: Option<JsBuffer>,
}
impl JsViewResult {
    pub fn new(node_env: &napi::Env, result: TxViewResult) -> anyhow::Result<Self> {
        Ok(Self {
            success: result.success,
            output: result.output.map(|o| {
                node_env
                    .create_buffer_with_data(Into::<Vec<u8>>::into(o))
                    .unwrap()
                    .into_raw()
            }),
        })
    }
}

#[napi(object)]
pub struct JsPreverifyTransactionResult {
    pub success: JsBoolean,
    pub initial_gas_used: JsBigInt,
    pub error: Option<JsString>,
}

impl JsPreverifyTransactionResult {
    pub fn new(node_env: &napi::Env, result: PreverifyTxResult) -> anyhow::Result<Self> {
        let error = if let Some(error) = result.error {
            Some(node_env.create_string(&error)?)
        } else {
            None
        };

        Ok(Self {
            success: node_env.get_boolean(result.success)?,
            initial_gas_used: node_env.create_bigint_from_u64(result.initial_gas_used)?,
            error,
        })
    }
}

#[napi(object)]
pub struct JsTransactionReceipt {
    pub block_number: Option<JsBigInt>,
    pub tx_hash: Option<JsString>,

    pub gas_used: JsBigInt,
    pub gas_refunded: JsBigInt,
    pub status: JsNumber,
    pub contract_address: Option<JsString>,

    pub logs: serde_json::Value,
    pub output: Option<JsBuffer>,
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
    pub fn new(node_env: &napi::Env, receipt: TxReceipt) -> anyhow::Result<Self> {
        let contract_address = if let Some(contract_address) = receipt.contract_address {
            Some(node_env.create_string_from_std(contract_address)?)
        } else {
            None
        };

        Ok(JsTransactionReceipt {
            gas_used: node_env.create_bigint_from_u64(receipt.gas_used)?,
            gas_refunded: node_env.create_bigint_from_u64(receipt.gas_refunded)?,
            status: node_env.create_uint32(receipt.success as u32)?,
            contract_address,
            logs: receipt
                .logs
                .map(|l| serde_json::to_value(l).unwrap())
                .unwrap_or_else(|| serde_json::Value::Null), // TODO: check if null is correct
            output: receipt.output.map(|o| {
                node_env
                    .create_buffer_with_data(Into::<Vec<u8>>::into(o))
                    .unwrap()
                    .into_raw()
            }),
            block_number: None,
            tx_hash: None,
        })
    }
}

#[napi(object)]
pub struct JsAccountInfo {
    pub balance: JsBigInt,
    pub nonce: JsBigInt,
}

impl JsAccountInfo {
    pub fn new(node_env: &napi::Env, account_info: AccountInfo) -> anyhow::Result<Self> {
        Ok(JsAccountInfo {
            nonce: node_env.create_bigint_from_u64(account_info.nonce)?,
            balance: utils::convert_u256_to_bigint(node_env, account_info.balance)?,
        })
    }
}

impl TryInto<AccountInfo> for JsAccountInfo {
    type Error = anyhow::Error;

    fn try_into(self) -> Result<AccountInfo, Self::Error> {
        Ok(AccountInfo {
            balance: utils::convert_bigint_to_u256(self.balance)?,
            nonce: self.nonce.get_u64()?.0,
            ..Default::default()
        })
    }
}

#[napi(object)]
pub struct JsAccountUpdate {
    pub address: JsString,
    pub balance: JsBigInt,
    pub nonce: JsBigInt,
    pub vote: Option<JsString>,
    pub unvote: Option<JsString>,
    pub username: Option<JsString>,
    pub username_resigned: JsBoolean,
    pub legacy_merge_info: Option<JsAccountMergeInfo>,
}

impl JsAccountUpdate {
    pub fn new(node_env: &napi::Env, account_update: AccountUpdate) -> anyhow::Result<Self> {
        let vote = match &account_update.vote {
            Some(vote) => Some(node_env.create_string_from_std(vote.to_string())?),
            None => None,
        };

        let unvote = match &account_update.unvote {
            Some(unvote) => Some(node_env.create_string_from_std(unvote.to_string())?),
            None => None,
        };

        let username = match &account_update.username {
            Some(username) => Some(node_env.create_string_from_std(username.to_string())?),
            None => None,
        };

        let username_resigned = node_env.get_boolean(account_update.username_resigned)?;

        let legacy_merge_info = match &account_update.merge_info {
            Some(legacy_merge_info) => Some(JsAccountMergeInfo {
                address: node_env
                    .create_string_from_std(legacy_merge_info.legacy_address.to_string())?,
                tx_hash: node_env
                    .create_string_from_std(legacy_merge_info.transaction_hash.to_string())?,
            }),
            None => None,
        };

        Ok(JsAccountUpdate {
            address: node_env.create_string_from_std(account_update.address.to_checksum(None))?,
            nonce: node_env.create_bigint_from_u64(account_update.nonce)?,
            balance: utils::convert_u256_to_bigint(node_env, account_update.balance)?,
            vote,
            unvote,
            username,
            username_resigned,
            legacy_merge_info,
        })
    }
}

#[napi(object)]
pub struct JsAccountInfoExtended {
    pub address: JsString,
    pub balance: JsBigInt,
    pub nonce: JsBigInt,
    pub legacy_attributes: JsLegacyAttributes,
}

#[napi(object)]
pub struct JsLegacyColdWallet {
    pub address: JsString,
    pub balance: JsBigInt,
    pub legacy_attributes: JsLegacyAttributes,
    pub merge_info: Option<JsAccountMergeInfo>,
}

#[napi(object)]
pub struct JsAccountMergeInfo {
    pub address: JsString,
    pub tx_hash: JsString,
}

impl JsLegacyColdWallet {
    pub fn new(node_env: &napi::Env, wallet: LegacyColdWallet) -> anyhow::Result<Self> {
        let merge_info = if let Some(merged_account) = wallet.merge_info {
            Some(JsAccountMergeInfo {
                address: node_env.create_string(&merged_account.1.to_string())?,
                tx_hash: node_env.create_string(&merged_account.0.to_string())?,
            })
        } else {
            None
        };

        Ok(JsLegacyColdWallet {
            address: node_env.create_string(&wallet.address.to_string())?,
            balance: utils::convert_u256_to_bigint(node_env, wallet.balance)?,
            legacy_attributes: JsLegacyAttributes::new(node_env, wallet.legacy_attributes)?,
            merge_info,
        })
    }
}

#[napi(object)]
pub struct JsLegacyAttributes {
    pub second_public_key: Option<JsString>,
    pub multi_signature: Option<JsLegacyMultiSignatureAttribute>,
}

#[napi(object)]
pub struct JsLegacyMultiSignatureAttribute {
    pub min: JsNumber,
    pub public_keys: Vec<JsString>,
}

impl JsAccountInfoExtended {
    pub fn new(
        node_env: &napi::Env,
        account_info_extended: AccountInfoExtended,
    ) -> anyhow::Result<Self> {
        Ok(JsAccountInfoExtended {
            address: node_env.create_string(&account_info_extended.address.to_string())?,
            nonce: node_env.create_bigint_from_u64(account_info_extended.info.nonce)?,
            balance: utils::convert_u256_to_bigint(node_env, account_info_extended.info.balance)?,
            legacy_attributes: JsLegacyAttributes::new(
                node_env,
                account_info_extended.legacy_attributes,
            )?,
        })
    }
}

impl TryInto<AccountInfoExtended> for JsAccountInfoExtended {
    type Error = crate::Error;

    fn try_into(self) -> Result<AccountInfoExtended, Self::Error> {
        Ok(AccountInfoExtended {
            address: utils::create_address_from_js_string(self.address)?,
            info: AccountInfo {
                balance: utils::convert_bigint_to_u256(self.balance)?,
                nonce: self.nonce.get_u64()?.0,
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
                utils::create_address_from_js_string(merge_info.address)?,
            ))
        } else {
            None
        };

        Ok(LegacyColdWallet {
            address: utils::create_legacy_address_from_js_string(self.address)?,
            balance: utils::convert_bigint_to_u256(self.balance)?,
            legacy_attributes: self.legacy_attributes.try_into()?,
            merge_info,
        })
    }
}

impl JsLegacyAttributes {
    pub fn new(
        node_env: &napi::Env,
        legacy_attributes: LegacyAccountAttributes,
    ) -> anyhow::Result<Self> {
        let second_public_key = if let Some(second_public_key) = legacy_attributes.second_public_key
        {
            Some(node_env.create_string(second_public_key.as_str())?)
        } else {
            None
        };

        let multi_signature = if let Some(multi_signature) = legacy_attributes.multi_signature {
            let mut public_keys = Vec::with_capacity(multi_signature.public_keys.len());

            for public_key in multi_signature.public_keys {
                public_keys.push(node_env.create_string(public_key.as_str())?);
            }

            Some(JsLegacyMultiSignatureAttribute {
                min: node_env.create_uint32(multi_signature.min as u32)?,
                public_keys,
            })
        } else {
            None
        };

        Ok(JsLegacyAttributes {
            second_public_key,
            multi_signature,
        })
    }
}

impl TryInto<LegacyAccountAttributes> for JsLegacyAttributes {
    type Error = crate::Error;

    fn try_into(self) -> Result<LegacyAccountAttributes, Self::Error> {
        let second_public_key = if let Some(second_public_key) = self.second_public_key {
            Some(second_public_key.into_utf8()?.into_owned()?)
        } else {
            None
        };

        let multi_signature = if let Some(multi_signature) = self.multi_signature {
            Some(multi_signature.try_into()?)
        } else {
            None
        };

        Ok(LegacyAccountAttributes {
            second_public_key,
            multi_signature,
        })
    }
}

impl TryInto<LegacyMultiSignatureAttribute> for JsLegacyMultiSignatureAttribute {
    type Error = crate::Error;

    fn try_into(self) -> Result<LegacyMultiSignatureAttribute, Self::Error> {
        let mut public_keys = Vec::with_capacity(self.public_keys.len());

        for p in self.public_keys {
            public_keys.push(p.into_utf8()?.into_owned()?);
        }

        Ok(LegacyMultiSignatureAttribute {
            min: self.min.get_uint32()? as usize,
            public_keys,
        })
    }
}

#[napi(object)]
pub struct JsGetAccounts {
    pub next_offset: Option<JsBigInt>,
    pub accounts: Vec<JsAccountInfoExtended>,
}

impl JsGetAccounts {
    pub fn new(
        node_env: &napi::Env,
        next_offset: Option<u64>,
        accounts: Vec<AccountInfoExtended>,
    ) -> anyhow::Result<Self> {
        let next_offset = match next_offset {
            Some(next_offset) => Some(node_env.create_bigint_from_u64(next_offset)?),
            None => None,
        };

        let mut mapped = Vec::with_capacity(accounts.len());
        for account in accounts {
            mapped.push(JsAccountInfoExtended::new(node_env, account)?);
        }

        Ok(JsGetAccounts {
            next_offset,
            accounts: mapped,
        })
    }
}

#[napi(object)]
pub struct JsGetLegacyColdWallets {
    pub next_offset: Option<JsBigInt>,
    pub wallets: Vec<JsLegacyColdWallet>,
}

impl JsGetLegacyColdWallets {
    pub fn new(
        node_env: &napi::Env,
        next_offset: Option<u64>,
        wallets: Vec<LegacyColdWallet>,
    ) -> anyhow::Result<Self> {
        let next_offset = match next_offset {
            Some(next_offset) => Some(node_env.create_bigint_from_u64(next_offset)?),
            None => None,
        };

        let mut mapped = Vec::with_capacity(wallets.len());
        for wallet in wallets {
            mapped.push(JsLegacyColdWallet::new(node_env, wallet)?);
        }

        Ok(JsGetLegacyColdWallets {
            next_offset,
            wallets: mapped,
        })
    }
}

#[napi(object)]
pub struct JsGetReceipts {
    pub next_offset: Option<JsBigInt>,
    pub receipts: Vec<JsTransactionReceipt>,
}

impl JsGetReceipts {
    pub fn new(
        node_env: &napi::Env,
        next_offset: Option<u64>,
        receipts_by_block_number: Vec<(u64, Vec<(B256, TxReceipt)>)>,
    ) -> anyhow::Result<Self> {
        let next_offset = match next_offset {
            Some(next_offset) => Some(node_env.create_bigint_from_u64(next_offset)?),
            None => None,
        };

        let mut mapped = vec![];
        for (block_number, tx_receipts) in receipts_by_block_number {
            for (hash, tx_receipt) in tx_receipts {
                let mut receipt = JsTransactionReceipt::new(node_env, tx_receipt)?;

                receipt.block_number = Some(node_env.create_bigint_from_u64(block_number)?);
                receipt.tx_hash = Some(node_env.create_string_from_std(hash.to_string())?);

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
    pub fn new(
        node_env: &napi::Env,
        receipt: Option<TxReceipt>,
        block_number: u64,
        tx_hash: B256,
    ) -> anyhow::Result<Self> {
        let receipt = match receipt {
            Some(receipt) => {
                let mut receipt = JsTransactionReceipt::new(node_env, receipt)?;
                receipt.block_number = Some(node_env.create_bigint_from_u64(block_number)?);
                receipt.tx_hash = Some(node_env.create_string_from_std(tx_hash.to_string())?);

                Some(receipt)
            }
            None => None,
        };

        Ok(JsGetReceipt { receipt })
    }
}

#[napi(object)]
pub struct JsGetState {
    pub block_number: JsBigInt,
    pub total_round: JsBigInt,
}

impl JsGetState {
    pub fn new(node_env: &napi::Env, state: (u64, u64)) -> anyhow::Result<Self> {
        Ok(JsGetState {
            block_number: node_env.create_bigint_from_u64(state.0)?,
            total_round: node_env.create_bigint_from_u64(state.1)?,
        })
    }
}
