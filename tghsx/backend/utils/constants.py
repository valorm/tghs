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

RPC_URL = "https://rpc-amoy.polygon.technology"  # or your Alchemy/Infura Amoy URL
