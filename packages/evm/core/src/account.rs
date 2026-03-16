use alloy_primitives::{B256, U256};
use revm::{primitives::Address, state::AccountInfo};
use serde::{Deserialize, Serialize};

use crate::legacy::LegacyAccountAttributes;

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct AccountInfoExtended {
    pub address: Address,
    pub info: AccountInfo,
    pub legacy_attributes: LegacyAccountAttributes,
}

impl AccountInfoExtended {
    pub fn into_parts(self) -> (Address, AccountInfo, Option<LegacyAccountAttributes>) {
        (
            self.address,
            self.info,
            if self.legacy_attributes.is_empty() {
                None
            } else {
                Some(self.legacy_attributes)
            },
        )
    }
}

#[derive(Default, Debug, Serialize, Deserialize)]
pub(crate) struct StoredAccountInfo {
    pub balance: U256,
    pub nonce: u64,
    pub code_hash: B256,
}

impl StoredAccountInfo {
    pub fn new(balance: U256, nonce: u64, code_hash: B256) -> Self {
        Self {
            balance,
            nonce,
            code_hash,
        }
    }
}

impl From<StoredAccountInfo> for AccountInfo {
    fn from(stored: StoredAccountInfo) -> Self {
        AccountInfo {
            balance: stored.balance,
            nonce: stored.nonce,
            code_hash: stored.code_hash,
            account_id: None,
            code: None,
        }
    }
}
