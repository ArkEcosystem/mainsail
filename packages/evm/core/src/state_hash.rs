use revm::primitives::{keccak256, B256};

use crate::state_commit::StateCommit;

pub fn calculate(current_hash: B256, state: &StateCommit) -> Result<B256, crate::db::Error> {
    let commit_hash = bincode::serialize(&state.change_set)?;
    let result = keccak256([current_hash.as_slice(), commit_hash.as_slice()].concat());

    Ok(result)
}

#[test]
fn test_calculate_state_hash() {
    let result = calculate(B256::ZERO, &Default::default()).expect("ok");
    assert_eq!(
        result,
        revm::primitives::b256!("dac7965a57e662c4fe4f2a69213893eec7dd9c0c1650ebf058659dc6fa017720")
    );
}
