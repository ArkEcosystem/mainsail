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
