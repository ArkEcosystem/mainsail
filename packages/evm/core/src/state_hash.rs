use rayon::slice::ParallelSliceMut;
use revm::primitives::{keccak256, B256};

use crate::{state_changes::StateChangeset, state_commit::StateCommit};

pub fn calculate(current_hash: B256, state: &StateCommit) -> Result<B256, crate::db::Error> {
    let commit_hash = bincode::serialize(&prepare(state))?;
    let result = keccak256([current_hash.as_slice(), commit_hash.as_slice()].concat());

    Ok(result)
}

fn prepare(state: &StateCommit) -> StateChangeset {
    let mut c = state.change_set.clone();

    c.accounts.par_sort_by_key(|a| a.0);
    c.contracts.par_sort_by_key(|a| a.0);
    for s in &mut c.storage {
        s.storage.par_sort_by_key(|slot| slot.0);
    }
    c.storage.par_sort_by_key(|a| a.address);
    c
}

#[test]
fn test_calculate_state_hash() {
    let result = calculate(B256::ZERO, &Default::default()).expect("ok");
    assert_eq!(
        result,
        revm::primitives::b256!("660b057b36925d4a0da5bf6588b4c64cff7f27ee34e9c90b052829bf8e2a3168")
    );
}
