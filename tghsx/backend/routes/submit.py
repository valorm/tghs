from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from web3 import Web3
from backend.utils.constants import RPC_URL, GHS_FEED_ADDRESS, GHS_FEED_ABI
from backend.utils.supabase_client import supabase

# Add deployed vault + ABI
VAULT_ADDRESS = "0x9a3Cdda4F71345f75E8c84f3C046e79591563c75"
VAULT_ABI = [
    {
        "inputs": [{"internalType": "address","name": "user","type": "address"}],
        "name": "getETHValueInGHS",
        "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address","name": "user","type": "address"}],
        "name": "getUSDTValueInGHS",
        "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

router = APIRouter()

class MintSubmit(BaseModel):
    wallet: str
    amount: float  # GHS requested

@router.post("/submit-mint")
def submit_mint(req: MintSubmit):
    try:
        w3 = Web3(Web3.HTTPProvider(RPC_URL))

        vault = w3.eth.contract(address=VAULT_ADDRESS, abi=VAULT_ABI)

        eth_ghs = vault.functions.getETHValueInGHS(req.wallet).call()
        usdt_ghs = vault.functions.getUSDTValueInGHS(req.wallet).call()

        total_ghs = (eth_ghs + usdt_ghs) / 1e18  # value in GHS

        print(f"ETH: {eth_ghs}, USDT: {usdt_ghs}, total: {total_ghs}")

        if total_ghs < req.amount * 1.5:
            raise HTTPException(status_code=400, detail="Insufficient collateral")

        # Insert into mint queue
        supabase.table("mint_queue").insert({
            "wallet": req.wallet,
            "amount": req.amount
        }).execute()

        return { "message": "Mint request accepted", "collateral_ghs": total_ghs }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
