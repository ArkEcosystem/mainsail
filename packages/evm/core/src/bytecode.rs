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

#[cfg(test)]
mod tests {
    use crate::bytecode::StoredBytecode;
    use alloy_primitives::Bytes;
    use revm::state::Bytecode;

    #[test]
    fn test_bytecode() {
        let raw_bytecode = Bytecode::new_raw(Bytes::from_static(&[1, 2, 3, 4]));
        let stored = StoredBytecode::from(raw_bytecode);

        assert_eq!(stored.raw, Bytes::from_static(&[1, 2, 3, 4]));
    }
}
