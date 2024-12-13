use revm::primitives::{AccountInfo, Address};
use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct LegacyAccountAttributes {
    pub second_public_key: Option<String>,
    pub multi_signature: Option<LegacyMultiSignatureAttribute>,
}

impl LegacyAccountAttributes {
    pub fn is_empty(&self) -> bool {
        self.second_public_key.is_none() && self.multi_signature.is_none()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct LegacyMultiSignatureAttribute {
    pub min: usize,
    pub public_keys: Vec<String>,
}
