import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Chainlink GHS/USD mock feed for testing
GHS_FEED_ADDRESS = "0xE06e0f832a509ca6acC1D822eF41A96a05Fd42e5"
GHS_FEED_ABI = [
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            {"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {"internalType": "int256", "name": "answer", "type": "int256"},
            {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
            {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# Load from .env
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
RPC_URL = os.getenv("AMOY_RPC_URL", "https://rpc-amoy.polygon.technology")
VAULT_ADDRESS = os.getenv("VAULT_ADDRESS")
TOKEN_ADDRESS = os.getenv("TOKEN_ADDRESS")

# Validate required .env variables
required_vars = {
    "PRIVATE_KEY": PRIVATE_KEY,
    "VAULT_ADDRESS": VAULT_ADDRESS,
    "TOKEN_ADDRESS": TOKEN_ADDRESS
}
for var, val in required_vars.items():
    if not val:
        raise ValueError(f"Missing env variable: {var}")

# ABI for TGHXToken
TOKEN_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "account", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "burnFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Complete ABI for CollateralVault (including view functions)
VAULT_ABI = [
    # View Functions
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getETHValueInGHS",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUSDTValueInGHS",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "ethUsdPriceFeed",
        "outputs": [{"internalType": "contract AggregatorV3Interface", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "ghsUsdPriceFeed",
        "outputs": [{"internalType": "contract AggregatorV3Interface", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "ethDeposits",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "usdtDeposits",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    
    # Transaction Functions
    {
        "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "depositETH",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "address", "name": "usdtToken", "type": "address"}
        ],
        "name": "depositUSDT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "unlockETH",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "address", "name": "usdtToken", "type": "address"}
        ],
        "name": "unlockUSDT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]