require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();
const path = require('path');

module.exports = {
  solidity: '0.8.20',
  networks: {
    amoy: {
      url: process.env.AMOY_RPC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache'
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY 
  }
};
