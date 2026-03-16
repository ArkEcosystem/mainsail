use alloy_primitives::Bytes;
use revm::{bytecode::BytecodeDecodeError, state::Bytecode};
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct StoredBytecode {
    pub raw: Bytes,
}

impl From<Bytecode> for StoredBytecode {
    fn from(code: Bytecode) -> Self {
        Self {
            raw: code.original_bytes(),
        }
    }
}

impl TryFrom<StoredBytecode> for Bytecode {
    type Error = BytecodeDecodeError;

    fn try_from(stored: StoredBytecode) -> Result<Self, Self::Error> {
        Bytecode::new_raw_checked(stored.raw)
    }
}
