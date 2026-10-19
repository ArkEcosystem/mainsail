// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.36;

/// Test fixture emitting the exact event signatures of ConsensusV1 and
/// UsernamesV1, so the Rust-side commit event decoding can be exercised
/// without deploying the full consensus system.
contract MainsailContractEvents {
    event Voted(address voter, address validator);
    event Unvoted(address voter, address validator);
    event ValidatorRegistered(address addr, bytes blsPublicKey);
    event ValidatorResigned(address addr);
    event ValidatorUpdated(address addr, bytes blsPublicKey);
    event UsernameRegistered(address addr, string username, string previousUsername);
    event UsernameResigned(address addr, string username);

    function emitConsensusEvents(address voter, address validator, bytes calldata blsPublicKey) external {
        emit Voted(voter, validator);
        emit Unvoted(voter, validator);
        emit ValidatorRegistered(voter, blsPublicKey);
        emit ValidatorResigned(voter);
        emit ValidatorUpdated(voter, blsPublicKey);
    }

    function emitUsernameEvents(address addr) external {
        emit UsernameRegistered(addr, "alice", "");
        emit UsernameRegistered(addr, "bob", "alice");
        emit UsernameResigned(addr, "bob");
    }
}
