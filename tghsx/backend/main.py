from fastapi import FastAPI
from backend.routes import mint, oracle, submit

app = FastAPI()
app.include_router(mint.router)
app.include_router(oracle.router)
app.include_router(submit.router)