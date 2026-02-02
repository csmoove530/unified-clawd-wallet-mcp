"""Treasury module for signing and broadcasting USDC + ETH transfers on Base."""
import logging
from typing import Optional

from web3 import Web3
from web3.exceptions import Web3Exception

from . import config

logger = logging.getLogger(__name__)

# Base mainnet constants
CHAIN_ID = 8453
USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USDC_DECIMALS = 6
GAS_LIMIT_ERC20 = 100_000
GAS_LIMIT_ETH = 21_000

# Minimal ERC-20 ABI for transfer + balanceOf
ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function",
    },
]


class TreasuryNotConfiguredError(Exception):
    pass


class InsufficientBalanceError(Exception):
    pass


class TransferError(Exception):
    pass


class TreasurySender:
    """Signs and broadcasts USDC + ETH transfers from the treasury wallet."""

    def __init__(self):
        if not config.TREASURY_PRIVATE_KEY and not config.MOCK_MODE:
            raise TreasuryNotConfiguredError("TREASURY_PRIVATE_KEY not set")

        self.mock_mode = config.MOCK_MODE
        self.w3: Optional[Web3] = None
        self.account = None
        self.usdc_contract = None

        if not self.mock_mode:
            self.w3 = Web3(Web3.HTTPProvider(config.BASE_RPC_URL))
            self.account = self.w3.eth.account.from_key(config.TREASURY_PRIVATE_KEY)
            self.usdc_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(USDC_CONTRACT), abi=ERC20_ABI
            )

    @property
    def address(self) -> str:
        if self.mock_mode:
            return "0x" + "0" * 40
        return self.account.address

    def _check_balances(self, usdc_amount: float, eth_amount: float) -> None:
        """Verify treasury has enough USDC and ETH before sending."""
        if self.mock_mode:
            return

        usdc_raw = int(usdc_amount * 10**USDC_DECIMALS)
        usdc_balance = self.usdc_contract.functions.balanceOf(self.account.address).call()
        if usdc_balance < usdc_raw:
            raise InsufficientBalanceError(
                f"Insufficient USDC: have {usdc_balance / 10**USDC_DECIMALS:.2f}, "
                f"need {usdc_amount:.2f}"
            )

        eth_raw = self.w3.to_wei(eth_amount, "ether")
        # Need enough for ETH transfer + gas for both txs
        estimated_gas_cost = self.w3.to_wei(0.001, "ether")  # generous estimate
        eth_balance = self.w3.eth.get_balance(self.account.address)
        if eth_balance < eth_raw + estimated_gas_cost:
            raise InsufficientBalanceError(
                f"Insufficient ETH: have {self.w3.from_wei(eth_balance, 'ether'):.6f}, "
                f"need ~{eth_amount + 0.001:.6f} (including gas)"
            )

    def send_usdc(
        self, recipient: str, amount: float, nonce: Optional[int] = None
    ) -> dict:
        """Send USDC to recipient. Returns {tx_hash, block_number}."""
        if self.mock_mode:
            logger.info(f"[MOCK] send_usdc: {amount} USDC -> {recipient}")
            return {
                "tx_hash": "0x" + "a" * 64,
                "block_number": 0,
            }

        recipient = Web3.to_checksum_address(recipient)
        raw_amount = int(amount * 10**USDC_DECIMALS)

        if nonce is None:
            nonce = self.w3.eth.get_transaction_count(self.account.address)

        tx = self.usdc_contract.functions.transfer(recipient, raw_amount).build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "gas": GAS_LIMIT_ERC20,
                "maxFeePerGas": self.w3.eth.gas_price * 2,
                "maxPriorityFeePerGas": self.w3.to_wei(0.001, "gwei"),
                "chainId": CHAIN_ID,
                "type": 2,  # EIP-1559
            }
        )

        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        if receipt.status != 1:
            raise TransferError(f"USDC transfer reverted: {tx_hash.hex()}")

        logger.info(f"USDC sent: {amount} -> {recipient} tx={tx_hash.hex()}")
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
        }

    def send_eth(
        self, recipient: str, amount: float, nonce: Optional[int] = None
    ) -> dict:
        """Send native ETH to recipient. Returns {tx_hash, block_number}."""
        if self.mock_mode:
            logger.info(f"[MOCK] send_eth: {amount} ETH -> {recipient}")
            return {
                "tx_hash": "0x" + "b" * 64,
                "block_number": 0,
            }

        recipient = Web3.to_checksum_address(recipient)
        raw_amount = self.w3.to_wei(amount, "ether")

        if nonce is None:
            nonce = self.w3.eth.get_transaction_count(self.account.address)

        tx = {
            "from": self.account.address,
            "to": recipient,
            "value": raw_amount,
            "nonce": nonce,
            "gas": GAS_LIMIT_ETH,
            "maxFeePerGas": self.w3.eth.gas_price * 2,
            "maxPriorityFeePerGas": self.w3.to_wei(0.001, "gwei"),
            "chainId": CHAIN_ID,
            "type": 2,  # EIP-1559
        }

        signed = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        if receipt.status != 1:
            raise TransferError(f"ETH transfer reverted: {tx_hash.hex()}")

        logger.info(f"ETH sent: {amount} -> {recipient} tx={tx_hash.hex()}")
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
        }

    def send_invite_payout(
        self, recipient: str, usdc_amount: float, eth_amount: float
    ) -> dict:
        """Send both ETH (for gas) and USDC to a recipient.

        Sends ETH first so the recipient has gas for future transactions.
        Uses sequential nonces to avoid waiting for the first tx to confirm.

        Returns {eth_tx_hash, usdc_tx_hash, eth_block, usdc_block}.
        """
        if self.mock_mode:
            eth_result = self.send_eth(recipient, eth_amount)
            usdc_result = self.send_usdc(recipient, usdc_amount)
            return {
                "eth_tx_hash": eth_result["tx_hash"],
                "usdc_tx_hash": usdc_result["tx_hash"],
                "eth_block": eth_result["block_number"],
                "usdc_block": usdc_result["block_number"],
            }

        # Pre-flight balance check
        self._check_balances(usdc_amount, eth_amount)

        # Get nonce once, increment for second tx
        nonce = self.w3.eth.get_transaction_count(self.account.address)

        # Send ETH first (user needs gas)
        eth_result = self.send_eth(recipient, eth_amount, nonce=nonce)

        # Send USDC with next nonce
        usdc_result = self.send_usdc(recipient, usdc_amount, nonce=nonce + 1)

        return {
            "eth_tx_hash": eth_result["tx_hash"],
            "usdc_tx_hash": usdc_result["tx_hash"],
            "eth_block": eth_result["block_number"],
            "usdc_block": usdc_result["block_number"],
        }
