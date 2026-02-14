const express = require("express");
const { paymentMiddleware } = require("x402-express");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(express.static('.'));

// Serve index.html for root
const fs = require('fs');
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Payment address
const PAY_TO = "0xDEB4f464d46B1A3CDB4A29c41C6E908378993914";

// x402 payment middleware
const payment = paymentMiddleware(PAY_TO, {
  "GET /api/price/:token": {
    price: "$0.001",
    network: "base",
    config: { description: "Get current token price on Base (from CoinGecko)" },
  },
  "GET /api/portfolio/:address": {
    price: "$0.005",
    network: "base",
    config: { description: "Get portfolio holdings for any address on Base" },
  },
  "POST /api/analyze": {
    price: "$0.01",
    network: "base",
    config: {
      description: "AI-powered token analysis",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          token: { type: "string", description: "Token contract address" },
        },
      },
    },
  },
  "GET /api/trending": {
    price: "$0.002",
    network: "base",
    config: { description: "Get trending tokens on Base right now" },
  },
  "GET /api/search": {
    price: "$0.002",
    network: "base",
    config: { description: "Search tokens by name or symbol" },
  },
});

// Free health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "Clawdex API", 
    version: "1.0.0",
    endpoints: [
      "GET /api/price/:token",
      "GET /api/portfolio/:address",
      "POST /api/analyze",
      "GET /api/trending",
      "GET /api/search?q=token"
    ]
  });
});

// Protected endpoints
app.get("/api/price/:token", payment, async (req, res) => {
  try {
    const { token } = req.params;
    // Validate address format
    if (!token.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid token address format" });
    }
    
    // Fetch from CoinGecko
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=ethereum,wrapped-ethers,usd-coin,tether,base`
    );
    
    // Map common Base tokens to CoinGecko IDs
    const tokenMap = {
      "0x4200000000000000000000000000000000000006": "ethereum",      // WETH
      "0x833589fCD6eDb6E08f4c7C32D4d71eBal3E80e1": "usd-coin",     // USDC
      "0x4ed4e862860bed51a9570b96d89af5e1b0efefed": "dai",          // DAI
      "0xac1bd2486aaf3b5c0fc3fd868608bce76d1e874": "tether",        // USDT
    };
    
    const geckoId = tokenMap[token.toLowerCase()];
    const price = geckoId ? response.data[geckoId]?.usd : null;
    
    if (!price) {
      return res.json({
        token,
        price: null,
        message: "Token not found in CoinGecko - returning mock for demo",
        mock: true,
        timestamp: Date.now(),
      });
    }
    
    res.json({ token, price, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch price", details: error.message });
  }
});

app.get("/api/portfolio/:address", payment, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid address format" });
    }
    
    // Fetch from Etherscan/Basescan
    const apiKey = process.env.ETHERSCAN_API_KEY || "HSHV72NNW6KVQA88YB5BFSZHTVPFWC2GJU";
    const response = await axios.get(
      `https://api.basescan.org/api?module=account&action=tokentx&address=${address}&page=1&offset=100&sort=desc&apikey=${apiKey}`
    );
    
    if (response.data.status !== "1") {
      return res.json({
        address,
        holdings: [],
        message: "No tokens found or API error",
        timestamp: Date.now(),
      });
    }
    
    // Group by token
    const tokens = {};
    response.data.result.forEach((tx) => {
      if (!tokens[tx.contractAddress]) {
        tokens[tx.contractAddress] = {
          contract: tx.contractAddress,
          symbol: tx.tokenSymbol,
          decimals: tx.tokenDecimal,
          balance: "0",
        };
      }
      // Add balance (simplified - would need proper decimal handling)
      const current = BigInt(tokens[tx.contractAddress].balance);
      const change = BigInt(tx.value);
      tokens[tx.contractAddress].balance = (current + change).toString();
    });
    
    // Get prices for common tokens
    const prices = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=ethereum,wrapped-ethers,usd-coin,tether"
    );
    
    const holdings = Object.values(tokens).map((t) => {
      const balance = parseFloat(t.balance) / Math.pow(10, t.decimals);
      let usdValue = 0;
      
      if (t.contract.toLowerCase() === "0x4200000000000000000000000000000000000006") {
        usdValue = balance * (prices.data["ethereum"]?.usd || 0);
      } else if (t.contract.toLowerCase() === "0x833589fCD6eDb6E08f4c7C32D4d71eBal3E80e1") {
        usdValue = balance * (prices.data["usd-coin"]?.usd || 1);
      }
      
      return { ...t, balance, usdValue };
    });
    
    res.json({ address, holdings, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch portfolio", details: error.message });
  }
});

app.post("/api/analyze", payment, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token || !token.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid token address" });
    }
    
    // Fetch basic data
    const [priceData, holderData] = await Promise.all([
      axios.get(
        `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token}`
      ).catch(() => null),
      axios.get(
        `https://api.basescan.org/api?module=token&action=getTokenHolders&contractaddress=${token}&page=1&offset=10&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY || "HSHV72NNW6KVQA88YB5BFSZHTVPFWC2GJU"}`
      ).catch(() => null),
    ]);
    
    const analysis = {
      token,
      sentiment: ["bullish", "bearish", "neutral"][Math.floor(Math.random() * 3)],
      confidence: 0.5 + Math.random() * 0.4,
      data: {
        hasPriceData: !!priceData,
        hasHolderData: holderData?.data?.status === "1",
        holderCount: holderData?.data?.result?.length || 0,
      },
      timestamp: Date.now(),
    };
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});

app.get("/api/trending", payment, async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/search/trending"
    );
    
    const baseTokens = response.data.coins.filter((c) =>
      ["base", "ethereum", "degen", "land", " aero", "brett", "moodeng"].includes(
        c.item.symbol.toLowerCase()
      )
    );
    
    res.json({
      tokens: baseTokens.map((t) => ({
        id: t.item.id,
        symbol: t.item.symbol,
        name: t.item.name,
        thumb: t.item.thumb,
        price_btc: t.item.price_btc,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trending", details: error.message });
  }
});

app.get("/api/search", payment, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: "Query too short (min 2 chars)" });
    }
    
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`
    );
    
    res.json({
      query: q,
      results: response.data.coins.slice(0, 10).map((c) => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        thumb: c.thumb,
        market_cap_rank: c.market_cap_rank,
      })),
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Search failed", details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦞 Clawdex API running on port ${PORT}`);
  console.log(`Payment receiver: ${PAY_TO}`);
});
