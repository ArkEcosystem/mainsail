// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

error CallerIsNotOwner();
error CallerIsOwner();

error InvalidUsername();
error TakenUsername();
error UsernameNotRegistered();

contract UsernamesV1 is Initializable, UUPSUpgradeable {
    address private _owner;

    mapping(address => string) private _usernames;
    mapping(bytes32 => bool) private _usernameExists;

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != _owner) {
            revert CallerIsNotOwner();
        }
        _;
    }

    modifier preventOwner() {
        if (msg.sender == _owner) {
            revert CallerIsOwner();
        }
        _;
    }

    // Initializers
    function initialize() public initializer {
        _owner = msg.sender;
    }

    // Overrides
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // External functions
    function addUsername(address user, string memory username) external onlyOwner {
        bytes memory b = bytes(username);
        // Full username verification is intentionally skipped for backwards compatibility
        if (b.length < 1 || b.length > 20) {
            revert InvalidUsername();
        }

        bytes32 usernameHash = keccak256(b);
        if (_usernameExists[usernameHash]) {
            revert TakenUsername();
        }

        // If user already has a username
        if (bytes(_usernames[user]).length > 0) {
            _usernameExists[keccak256(bytes(_usernames[user]))] = false; // Remove old username
        }

        _usernames[user] = username;
        _usernameExists[usernameHash] = true;
    }

    function registerUsername(string memory username) external preventOwner {
        // Register username
        bytes memory b = bytes(username);
        if (!_verifyUsername(b)) {
            revert InvalidUsername();
        }

        bytes32 usernameHash = keccak256(b);
        if (_usernameExists[usernameHash]) {
            revert TakenUsername();
        }

        // If user already has a username
        if (bytes(_usernames[msg.sender]).length > 0) {
            _usernameExists[keccak256(bytes(_usernames[msg.sender]))] = false; // Remove old username
        }

        _usernames[msg.sender] = username;
        _usernameExists[usernameHash] = true;
    }

    function resignUsername() external {
        // If user already has a username
        if (bytes(_usernames[msg.sender]).length > 0) {
            _usernameExists[keccak256(bytes(_usernames[msg.sender]))] = false;
            delete _usernames[msg.sender];
        } else {
            revert UsernameNotRegistered();
        }
    }

    // External functions that are view
    function getUsername(address user) external view returns (string memory) {
        return _usernames[user];
    }

    function isUsernameRegistered(string memory username) external view returns (bool) {
        return _usernameExists[keccak256(bytes(username))];
    }

    function isUsernameValid(string memory username) external pure returns (bool) {
        return _verifyUsername(bytes(username));
    }

    // Internal function
    // RULES:
    // minimum length of 1 character
    // maximum length of 20 characters
    // only lowercase letters, numbers and underscores are allowed
    // cannot start or end with underscore
    // cannot contain two or more consecutive underscores
    function _verifyUsername(bytes memory username) internal pure returns (bool) {
        // minimum length of 1 character
        // maximum length of 20 characters
        if (username.length < 1 || username.length > 20) {
            return false;
        }

        // cannot start or end with underscore
        if (username[0] == 0x5F || username[username.length - 1] == 0x5F) {
            return false;
        }

        for (uint256 i = 0; i < username.length; i++) {
            // only lowercase letters, numbers and underscores are allowed
            if (
                !(username[i] >= 0x30 && username[i] <= 0x39) // 0-9
                    && !(username[i] >= 0x61 && username[i] <= 0x7A) // a-z
                    && !(username[i] == 0x5F) // _
            ) {
                return false;
            }

            // No need to care out ot bound access at i + 1, because previous test already check that latest character is not underscore
            if (username[i] == 0x5F && username[i + 1] == 0x5F) {
                return false;
            }
        }

        return true;
    }
}
