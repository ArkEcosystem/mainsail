use mainsail_evm_core::{
    account::{AccountInfoExtended, LegacyAccountAttributes},
    receipt::TxReceipt,
    state_changes::AccountUpdate,
};
use napi::{JsBigInt, JsBoolean, JsBuffer, JsString};
use napi_derive::napi;
use revm::primitives::{AccountInfo, Bytes, B256};

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
pub struct JsTransactionReceipt {
    pub block_height: Option<JsBigInt>,
    pub tx_hash: Option<JsString>,

    pub gas_used: JsBigInt,
    pub gas_refunded: JsBigInt,
    pub success: bool,
    pub deployed_contract_address: Option<JsString>,

    // TODO: typing
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

impl JsTransactionReceipt {
    pub fn new(node_env: &napi::Env, receipt: TxReceipt) -> anyhow::Result<Self> {
        let deployed_contract_address =
            if let Some(contract_address) = receipt.deployed_contract_address {
                Some(node_env.create_string_from_std(contract_address)?)
            } else {
                None
            };

        Ok(JsTransactionReceipt {
            gas_used: node_env.create_bigint_from_u64(receipt.gas_used)?,
            gas_refunded: node_env.create_bigint_from_u64(receipt.gas_refunded)?,
            success: receipt.success,
            deployed_contract_address,
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
            block_height: None,
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

        Ok(JsAccountUpdate {
            address: node_env.create_string_from_std(account_update.address.to_checksum(None))?,
            nonce: node_env.create_bigint_from_u64(account_update.nonce)?,
            balance: utils::convert_u256_to_bigint(node_env, account_update.balance)?,
            vote,
            unvote,
            username,
            username_resigned,
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
pub struct JsLegacyAttributes {
    pub second_public_key: Option<JsString>,
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

        Ok(JsLegacyAttributes { second_public_key })
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

        Ok(LegacyAccountAttributes { second_public_key })
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
pub struct JsGetReceipts {
    pub next_offset: Option<JsBigInt>,
    pub receipts: Vec<JsTransactionReceipt>,
}

impl JsGetReceipts {
    pub fn new(
        node_env: &napi::Env,
        next_offset: Option<u64>,
        receipts_by_height: Vec<(u64, Vec<(B256, TxReceipt)>)>,
    ) -> anyhow::Result<Self> {
        let next_offset = match next_offset {
            Some(next_offset) => Some(node_env.create_bigint_from_u64(next_offset)?),
            None => None,
        };

        let mut mapped = vec![];
        for (height, tx_receipts) in receipts_by_height {
            for (hash, tx_receipt) in tx_receipts {
                let mut receipt = JsTransactionReceipt::new(node_env, tx_receipt)?;

                receipt.block_height = Some(node_env.create_bigint_from_u64(height)?);
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
        height: u64,
        tx_hash: B256,
    ) -> anyhow::Result<Self> {
        let receipt = match receipt {
            Some(receipt) => {
                let mut receipt = JsTransactionReceipt::new(node_env, receipt)?;
                receipt.block_height = Some(node_env.create_bigint_from_u64(height)?);
                receipt.tx_hash = Some(node_env.create_string_from_std(tx_hash.to_string())?);

                Some(receipt)
            }
            None => None,
        };

        Ok(JsGetReceipt { receipt })
    }
}
