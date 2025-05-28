import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Existing constants
GHS_FEED_ADDRESS = "0xE06e0f832a509ca6acC1D822eF41A96a05Fd42e5"  # your deployed mock GHS/USD
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

# Environment variables from .env file
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
RPC_URL = os.getenv("AMOY_RPC_URL", "https://rpc-amoy.polygon.technology")  # fallback to default
VAULT_ADDRESS = os.getenv("VAULT_ADDRESS")
TOKEN_ADDRESS = os.getenv("TOKEN_ADDRESS")

# Validate required environment variables
required_vars = {
    "PRIVATE_KEY": PRIVATE_KEY,
    "VAULT_ADDRESS": VAULT_ADDRESS,
    "TOKEN_ADDRESS": TOKEN_ADDRESS
}

for var_name, var_value in required_vars.items():
    if not var_value:
        raise ValueError(f"{var_name} not found in environment variables")

# TOKEN_ABI - You'll need to add your ERC20 token ABI here
TOKEN_ABI = [
    # Add your token contract ABI here
    # This is a basic ERC20 ABI - replace with your actual token ABI
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
    }
    # Add more ABI functions as needed
]