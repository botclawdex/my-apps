const express = require("express");
const { paymentMiddleware } = require("x402-express");

const app = express();
app.use(express.json());

// Payment address - will receive USDC
const PAY_TO = "0xDEB4f464d46B1A3CDB4A29c41C6E908378993914";

// x402 payment middleware
const payment = paymentMiddleware(PAY_TO, {
  "GET /api/price/:token": {
    price: "$0.001",
    network: "base",
    config: {
      description: "Get current token price on Base (from CoinGecko)",
    },
  },
  "GET /api/portfolio/:address": {
    price: "$0.005",
    network: "base",
    config: {
      description: "Get portfolio holdings for any address on Base",
    },
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
    config: {
      description: "Get trending tokens on Base right now",
    },
  },
});

// Free health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Clawdex API", version: "1.0.0" });
});

// Protected endpoints
app.get("/api/price/:token", payment, async (req, res) => {
  const { token } = req.params;
  // Mock response for now - in production, fetch from CoinGecko
  res.json({
    token,
    price: Math.random() * 100,
    timestamp: Date.now(),
  });
});

app.get("/api/portfolio/:address", payment, async (req, res) => {
  const { address } = req.params;
  // Mock response - in production, fetch from Etherscan
  res.json({
    address,
    holdings: [
      { token: "USDC", balance: Math.random() * 10000 },
      { token: "ETH", balance: Math.random() * 10 },
    ],
    timestamp: Date.now(),
  });
});

app.post("/api/analyze", payment, async (req, res) => {
  const { token } = req.body;
  // Mock AI analysis
  res.json({
    token,
    sentiment: ["bullish", "bearish", "neutral"][Math.floor(Math.random() * 3)],
    confidence: Math.random(),
    timestamp: Date.now(),
  });
});

app.get("/api/trending", payment, async (req, res) => {
  // Mock trending
  res.json({
    tokens: ["DEGEN", "BALD", "LAND", "AERO"],
    timestamp: Date.now(),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦞 Clawdex API running on port ${PORT}`);
  console.log(`Payment receiver: ${PAY_TO}`);
});
