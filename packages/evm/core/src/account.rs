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

#[cfg(test)]
mod tests {
    use crate::{account::AccountInfoExtended, legacy::LegacyAccountAttributes};
    use alloy_primitives::{U256, address, b256};
    use revm::state::AccountInfo;

    #[test]
    fn test_account_info_parts() {
        let info = AccountInfo {
            balance: U256::ONE,
            nonce: 1,
            code_hash: b256!("0000000000000000000000000000000000000000000000000000000000000001"),
            account_id: None,
            code: None,
        };

        let attributes = LegacyAccountAttributes {
            legacy_nonce: Some(0),
            second_public_key: Some("key".into()),
            multi_signature: None,
        };

        let account_info = AccountInfoExtended {
            address: address!("0000000000000000000000000000000000000001"),
            info: info.clone(),
            legacy_attributes: attributes.clone(),
        };

        let (address, info_part, legacy_attributes) = account_info.into_parts();

        assert_eq!(
            address,
            address!("0000000000000000000000000000000000000001")
        );
        assert_eq!(info, info_part);
        assert_eq!(legacy_attributes, Some(attributes));

        let account_info = AccountInfoExtended {
            address: address!("0000000000000000000000000000000000000001"),
            info: info.clone(),
            legacy_attributes: LegacyAccountAttributes {
                legacy_nonce: None,
                second_public_key: None,
                multi_signature: None,
            },
        };

        let (address, info_part, legacy_attributes) = account_info.into_parts();
        assert_eq!(
            address,
            address!("0000000000000000000000000000000000000001")
        );
        assert_eq!(info, info_part);
        assert_eq!(legacy_attributes, None);
    }
}
