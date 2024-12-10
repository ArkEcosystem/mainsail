use revm::primitives::AccountInfo;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct AccountInfoExtended {
    pub info: AccountInfo,
    pub legacy_attributes: LegacyAccountAttributes,
}

impl AccountInfoExtended {
    pub fn into_parts(self) -> (AccountInfo, Option<LegacyAccountAttributes>) {
        (
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
    // TODO: multi sig
}

impl LegacyAccountAttributes {
    pub fn is_empty(&self) -> bool {
        self.second_public_key.is_some()
    }
}
