// SPDX-License-Identifier: GNU GENERAL PUBLIC LICENSE
pragma solidity ^0.8.27;

contract MultiPayment {
    error RecipientsAndAmountsMismatch();
    error InvalidValue();
    error FailedToSendEther();

    function pay(address payable[] calldata recipients, uint256[] calldata amounts) public payable {
        if (recipients.length != amounts.length) {
            revert RecipientsAndAmountsMismatch();
        }
        // Ensure value sent is equal to the total amount to send
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (msg.value != total) {
            revert InvalidValue();
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool sent,) = recipients[i].call{value: amounts[i]}("");
            if (!sent) {
                revert FailedToSendEther();
            }
        }
    }
}
