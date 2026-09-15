use alloy_primitives::{Address, B256, Bytes};
use alloy_sol_types::sol;

sol! {
    interface ConsensusV1 {
        event Voted(address voter, address validator);
        event Unvoted(address voter, address validator);

        event ValidatorRegistered(address addr, bytes blsPublicKey);
        event ValidatorResigned(address addr);
        event ValidatorUpdated(address addr, bytes blsPublicKey);
    }

    interface UsernamesV1 {
        event UsernameRegistered(address addr, string username, string previousUsername);
        event UsernameResigned(address addr, string username);
    }
}

pub use ConsensusV1::{
    ConsensusV1Events, Unvoted, ValidatorRegistered, ValidatorResigned, ValidatorUpdated, Voted,
};
pub use UsernamesV1::{UsernameRegistered, UsernameResigned, UsernamesV1Events};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ContractEvent {
    pub tx_hash: B256,
    pub tx_index: u32,
    pub data: ContractEventData,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ContractEventData {
    Voted {
        voter: Address,
        validator: Address,
    },
    Unvoted {
        voter: Address,
        validator: Address,
    },
    ValidatorRegistered {
        addr: Address,
        bls_public_key: Bytes,
    },
    ValidatorResigned {
        addr: Address,
    },
    ValidatorUpdated {
        addr: Address,
        bls_public_key: Bytes,
    },
    UsernameRegistered {
        addr: Address,
        username: String,
        previous_username: Option<String>,
    },
    UsernameResigned {
        addr: Address,
        username: String,
    },
}

impl ContractEventData {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Voted { .. } => "Voted",
            Self::Unvoted { .. } => "Unvoted",
            Self::ValidatorRegistered { .. } => "ValidatorRegistered",
            Self::ValidatorResigned { .. } => "ValidatorResigned",
            Self::ValidatorUpdated { .. } => "ValidatorUpdated",
            Self::UsernameRegistered { .. } => "UsernameRegistered",
            Self::UsernameResigned { .. } => "UsernameResigned",
        }
    }
}
