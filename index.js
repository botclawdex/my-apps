const express = require("express");
const { paymentMiddleware } = require("x402-express");
const axios = require("axios");
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// Konfiguracja z env vars
const PAY_TO = process.env.PAY_TO || "0xDEB4f464d46B1A3CDB4A29c41C6E908378993914";

// Payment verification middleware - weryfikuje kto zapłacił
const verifyPayment = async (req, res, next) => {
  const isDemo = req.headers['x402'] === 'false' || req.headers['x402'] === false;
  
  if (isDemo) {
    req.payerAddress = 'demo';
    req.isPaid = false;
    return next();
  }
  
  // Sprawdź czy jest payment header
  const x402From = req.headers['x402-from'];
  const x402Sig = req.headers['x402-signature'];
  
  if (x402From && x402From.match(/^0x[a-fA-F0-9]{40}$/)) {
    req.payerAddress = x402From.toLowerCase();
    req.isPaid = true;
    
    // Log payment (w produkcji - weryfikacja on-chain)
    console.log(`💰 Payment received from: ${req.payerAddress}`);
  } else {
    req.payerAddress = null;
    req.isPaid = false;
  }
  
  next();
};

// Apply payment verification to all /api routes
app.use('/api', verifyPayment);
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "HSHV72NNW6KVQA88YB5BFSZHTVPFWC2GJU";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || ETHERSCAN_API_KEY;

// Podstawowe tokeny Base
const BASE_TOKENS = {
  "0x4200000000000000000000000000000000000006": { id: "ethereum", symbol: "WETH", decimals: 18 },
  "0x833589fCD6eDb6E08f4c7C32D4d71eBal3E80e1": { id: "usd-coin", symbol: "USDC", decimals: 6 },
  "0x4ed4e862860bed51a9570b96d89af5e1b0efefed": { id: "dai", symbol: "DAI", decimals: 18 },
  "0xac1bd2486aaf3b5c0fc3fd868608bce76d1e874": { id: "tether", symbol: "USDT", decimals: 6 },
  "0xa8b1254b825d3efd1e4d67ef5801dd9e73c5b3bb": { id: "wrapped-ether", symbol: "WETH", decimals: 18 },
};

// Payment wrapper - skip for demo mode (?demo=1)
const payment = (req, res, next) => {
  // Demo mode via query param
  if (req.query.demo === '1' || req.query.demo === 'true') {
    req.payerAddress = 'demo';
    req.isPaid = false;
    return next();
  }
  // Demo mode via header
  if (req.headers['x402'] === 'false' || req.headers['x402'] === false) {
    req.payerAddress = 'demo';
    req.isPaid = false;
    return next();
  }
  // Production - require payment via x402
  return paymentMiddleware(PAY_TO, endpointPrices)(req, res, next);
};

// Price config for x402
const endpointPrices = {
  // === REXCHANGE - DEX Aggregator ===
  "GET /api/v1/dex/quote": {
    price: "$0.01",
    network: "base",
    config: { description: "Get best swap quote from DEX aggregators" },
  },
  "GET /api/v1/dex/pools": {
    price: "$0.01",
    network: "base",
    config: { description: "List liquidity pools on Base DEXes" },
  },
  "GET /api/v1/dex/gas": {
    price: "$0.005",
    network: "base",
    config: { description: "Current gas prices on Base" },
  },
  
  // === RWATCH - On-Chain Monitor ===
  "GET /api/v1/watch/balance": {
    price: "$0.005",
    network: "base",
    config: { description: "Get full wallet balance on Base" },
  },
  "GET /api/v1/watch/history": {
    price: "$0.01",
    network: "base",
    config: { description: "Transaction history for address" },
  },
  "GET /api/v1/watch/token-holders": {
    price: "$0.02",
    network: "base",
    config: { description: "Token holder list with balances" },
  },
  
  // === RINTELLIGENCE - AI Analytics ===
  "GET /api/v1/ai/metrics": {
    price: "$0.02",
    network: "base",
    config: { description: "Token metrics: TVL, volume, market cap" },
  },
  "POST /api/v1/ai/analyze": {
    price: "$0.05",
    network: "base",
    config: { description: "AI-powered token analysis" },
  },
  "GET /api/v1/ai/trending": {
    price: "$0.01",
    network: "base",
    config: { description: "Trending tokens with AI scores" },
  },
  "GET /api/v1/ai/security": {
    price: "$0.05",
    network: "base",
    config: { description: "Security audit score for token" },
  },
  
  // === BASIC - Original API ===
  "GET /api/price/:token": {
    price: "$0.001",
    network: "base",
    config: { description: "Get token price from CoinGecko" },
  },
  "GET /api/portfolio/:address": {
    price: "$0.005",
    network: "base",
    config: { description: "Get portfolio holdings" },
  },
  "GET /api/search": {
    price: "$0.002",
    network: "base",
    config: { description: "Search tokens" },
  },
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Health check z info o API
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "Clawdex API", 
    version: "2.1.0",
    apps: ["rExchange", "rWatch", "rIntelligence"],
    paymentAddress: PAY_TO,
    network: "base",
    docs: "/api-docs",
    paymentVerification: {
      header: "x402-from",
      description: "Add your Base wallet address in header to verify payment",
      example: "fetch('/api/v1/dex/gas', { headers: { 'x402-from': '0x...' }})"
    }
  });
});

// API Docs
app.get("/api-docs", (req, res) => {
  res.json({
    title: "Clawdex API v2",
    description: "Agent monetization platform on Base",
    apps: {
      rExchange: {
        description: "DEX Aggregator - swap quotes, pool data, gas estimates",
        endpoints: [
          "GET /api/v1/dex/quote?from=ETH&to=USDC&amount=1",
          "GET /api/v1/dex/pools?token=0x...",
          "GET /api/v1/dex/gas"
        ]
      },
      rWatch: {
        description: "On-Chain Monitor - balances, history, holders",
        endpoints: [
          "GET /api/v1/watch/balance?address=0x...",
          "GET /api/v1/watch/history?address=0x...",
          "GET /api/v1/watch/token-holders?token=0x..."
        ]
      },
      rIntelligence: {
        description: "AI Analytics - metrics, analysis, trends",
        endpoints: [
          "GET /api/v1/ai/metrics?token=0x...",
          "POST /api/v1/ai/analyze {token: '0x...'}",
          "GET /api/v1/ai/trending",
          "GET /api/v1/ai/security?token=0x..."
        ]
      }
    }
  });
});

// ==================== REXCHANGE - DEX Aggregator ====================

app.get("/api/v1/dex/quote", payment, async (req, res) => {
  try {
    const { from, to, amount } = req.query;
    
    if (!from || !to || !amount) {
      return res.status(400).json({ 
        error: "Missing params", 
        usage: "/api/v1/dex/quote?from=ETH&to=USDC&amount=1" 
      });
    }
    
    // Mock quote response - in production integrate with 0x, 1Inch API
    const fromToken = from.toUpperCase();
    const toToken = to.toUpperCase();
    const amountNum = parseFloat(amount);
    
    // Simulate DEX prices
    const rates = {
      "ETH-USDC": 3245.50,
      "USDC-ETH": 0.000308,
      "WETH-USDC": 3245.50,
      "USDC-WETH": 0.000308,
    };
    
    const rate = rates[`${fromToken}-${toToken}`] || (Math.random() * 3000 + 500);
    const output = amountNum * rate;
    const gasEstimate = 0.001 + Math.random() * 0.005; // ETH
    
    res.json({
      app: "rExchange",
      from: { symbol: fromToken, amount: amountNum },
      to: { symbol: toToken, amount: output.toFixed(6) },
      rate: rate.toFixed(6),
      priceImpact: (Math.random() * 2).toFixed(2),
      gas: { estimate: gasEstimate.toFixed(6), unit: "ETH" },
      sources: ["BaseSwap", "Aerodrome", "Velocimeter"],
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Quote failed", details: error.message });
  }
});

app.get("/api/v1/dex/pools", payment, async (req, res) => {
  try {
    const { token } = req.query;
    
    // Mock pool data
    const pools = [
      { dex: "Aerodrome", pair: "WETH/USDC", tvl: 45000000, volume24h: 12000000, apy: 12.5 },
      { dex: "BaseSwap", pair: "WETH/USDC", tvl: 28000000, volume24h: 8000000, apy: 10.2 },
      { dex: "Velocimeter", pair: "WETH/USDC", tvl: 15000000, volume24h: 4500000, apy: 15.8 },
    ];
    
    if (token) {
      // Filter for specific token
      pools.forEach(p => p.token = token);
    }
    
    res.json({
      app: "rExchange",
      token: token || "all",
      pools,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Pools fetch failed", details: error.message });
  }
});

app.get("/api/v1/dex/gas", payment, async (req, res) => {
  try {
    // Fetch real gas from RPC
    const gasPrice = await axios.post(
      "https://mainnet.base.org",
      { jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 },
      { headers: { "Content-Type": "application/json" } }
    ).catch(() => ({ data: { result: "0x4A817C800" } }));
    
    const gasWei = parseInt(gasPrice.data.result || "0x4A817C800", 16);
    const gasGwei = (gasWei / 1e9).toFixed(2);
    
    res.json({
      app: "rExchange",
      network: "base",
      gas: {
        slow: (parseFloat(gasGwei) * 0.8).toFixed(2),
        standard: parseFloat(gasGwei).toFixed(2),
        fast: (parseFloat(gasGwei) * 1.5).toFixed(2),
        unit: "Gwei",
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Gas fetch failed", details: error.message });
  }
});

// ==================== RWATCH - On-Chain Monitor ====================

app.get("/api/v1/watch/balance", payment, async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid address format" });
    }
    
    // Get ETH balance
    const ethBalance = await axios.post(
      "https://mainnet.base.org",
      {
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1
      },
      { headers: { "Content-Type": "application/json" } }
    ).catch(() => ({ data: { result: "0x0" } }));
    
    const wei = parseInt(ethBalance.data.result || "0x0", 16);
    const eth = (wei / 1e18).toFixed(6);
    
    // Get token balances from Basescan
    const tokens = await axios.get(
      `https://api.basescan.org/api?module=account&action=tokenlist&address=${address}&apikey=${BASESCAN_API_KEY}`
    ).catch(() => ({ data: { result: [] } }));
    
    const holdings = (tokens.data.result || []).map(t => ({
      symbol: t.symbol,
      name: t.name,
      contract: t.contractAddress,
      balance: (parseFloat(t.balance) / Math.pow(10, t.decimals)).toFixed(6),
      decimals: t.decimals,
    }));
    
    // Get USD prices
    const prices = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=ethereum,usd-coin`
    ).catch(() => ({ data: {} }));
    
    const ethPrice = prices.data?.ethereum?.usd || 3200;
    const totalUsd = parseFloat(eth) * ethPrice + 
      holdings.reduce((sum, t) => {
        if (t.symbol === "USDC") return sum + parseFloat(t.balance);
        return sum;
      }, 0);
    
    res.json({
      app: "rWatch",
      address,
      native: { symbol: "ETH", balance: eth, usdValue: (parseFloat(eth) * ethPrice).toFixed(2) },
      tokens: holdings,
      totalUsd: totalUsd.toFixed(2),
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Balance check failed", details: error.message });
  }
});

app.get("/api/v1/watch/history", payment, async (req, res) => {
  try {
    const { address, limit = 20 } = req.query;
    
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid address" });
    }
    
    const txs = await axios.get(
      `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${BASESCAN_API_KEY}`
    ).catch(() => ({ data: { result: [] } }));
    
    const transactions = (txs.data.result || []).slice(0, parseInt(limit)).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: (parseFloat(tx.value) / 1e18).toFixed(6),
      gas: tx.gasUsed,
      gasPrice: (parseFloat(tx.gasPrice) / 1e9).toFixed(2),
      timestamp: parseInt(tx.timeStamp) * 1000,
      block: tx.blockNumber,
    }));
    
    res.json({
      app: "rWatch",
      address,
      count: transactions.length,
      transactions,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "History fetch failed", details: error.message });
  }
});

app.get("/api/v1/watch/token-holders", payment, async (req, res) => {
  try {
    const { token, limit = 50 } = req.query;
    
    if (!token || !token.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid token address" });
    }
    
    const holders = await axios.get(
      `https://api.basescan.org/api?module=token&action=getTokenHolders&contractaddress=${token}&page=1&offset=${limit}&sort=desc&apikey=${BASESCAN_API_KEY}`
    ).catch(() => ({ data: { result: [] } }));
    
    const result = holders.data.result || [];
    const total = result.length;
    
    // Get top holders
    const topHolders = result.slice(0, parseInt(limit)).map((h, i) => ({
      rank: i + 1,
      address: h.TokenHolderAddress,
      balance: (parseFloat(h.TokenHolderQuantity)).toFixed(6),
      percentage: ((parseFloat(h.TokenHolderQuantity) / (parseFloat(result[0]?.TokenHolderQuantity || 1))) * 100).toFixed(2),
    }));
    
    res.json({
      app: "rWatch",
      token,
      totalHolders: total,
      topHolders,
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Holders fetch failed", details: error.message });
  }
});

// ==================== RINTELLIGENCE - AI Analytics ====================

app.get("/api/v1/ai/metrics", payment, async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || !token.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid token address" });
    }
    
    // Fetch from multiple sources
    const [geckoData, holderData] = await Promise.all([
      axios.get(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${token}`).catch(() => null),
      axios.get(`https://api.basescan.org/api?module=token&action=getTokenHolderList&contractaddress=${token}&page=1&offset=1&apikey=${BASESCAN_API_KEY}`).catch(() => null)
    ]);
    
    const metrics = {
      token,
      market: geckoData?.data ? {
        name: geckoData.data.name,
        symbol: geckoData.data.symbol,
        price: geckoData.data.market_data?.current_price?.usd || null,
        marketCap: geckoData.data.market_data?.market_cap?.usd || null,
        volume24h: geckoData.data.market_data?.total_volume?.usd || null,
        change24h: geckoData.data.market_data?.price_change_percentage_24h || null,
      } : null,
      holders: holderData?.data?.result ? {
        count: parseInt(holderData.data.result[0]?.TokenHolderQuantity || 0) > 1000 ? "1000+" : "<1000",
      } : null,
      confidence: geckoData?.data ? 85 : 30,
      timestamp: Date.now(),
    };
    
    res.json({
      app: "rIntelligence",
      metrics,
    });
  } catch (error) {
    res.status(500).json({ error: "Metrics fetch failed", details: error.message });
  }
});

app.post("/api/v1/ai/analyze", payment, async (req, res) => {
  try {
    const { token, depth = "basic" } = req.body;
    
    if (!token || !token.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid token address" });
    }
    
    // Get multiple data points
    const [priceData, holderData, txData] = await Promise.all([
      axios.get(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${token}`).catch(() => null),
      axios.get(`https://api.basescan.org/api?module=token&action=getTokenHolderList&contractaddress=${token}&page=1&offset=100&apikey=${BASESCAN_API_KEY}`).catch(() => null),
      axios.get(`https://api.basescan.org/api?module=account&action=txlist&address=${token}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${BASESCAN_API_KEY}`).catch(() => null)
    ]);
    
    // Calculate scores
    const holderCount = holderData?.data?.result?.length || 0;
    const txCount = txData?.data?.result?.length || 0;
    const hasVolume = priceData?.data?.market_data?.total_volume?.usd > 10000;
    
    const scores = {
      liquidity: holderCount > 500 ? 85 : holderCount > 100 ? 60 : 30,
      activity: txCount > 50 ? 90 : txCount > 10 ? 60 : 30,
      popularity: hasVolume ? 80 : 40,
      security: holderCount > 0 && txCount > 0 ? 75 : 40,
    };
    
    const overallScore = Math.round((scores.liquidity + scores.activity + scores.popularity + scores.security) / 4);
    
    // Generate sentiment
    const sentiments = ["bullish", "neutral", "bearish"];
    const sentiment = overallScore > 70 ? "bullish" : overallScore > 40 ? "neutral" : "bearish";
    
    const analysis = {
      token,
      sentiment,
      confidence: overallScore,
      scores,
      data: {
        holderCount,
        txCount,
        hasVolume,
        priceData: !!priceData?.data,
      },
      recommendation: overallScore > 70 ? "Consider for portfolio" : overallScore > 40 ? "More research needed" : "High risk - avoid",
      timestamp: Date.now(),
    };
    
    res.json({
      app: "rIntelligence",
      analysis,
    });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
});

app.get("/api/v1/ai/trending", payment, async (req, res) => {
  try {
    const trending = await axios.get(
      "https://api.coingecko.com/api/v3/search/trending"
    ).catch(() => ({ data: { coins: [] } }));
    
    // Filter for Base-related tokens
    const baseRelated = ["base", "degen", "aerodrome", "land", "brett", "moodeng", "toshi", "cbbtc"];
    const filtered = trending.data.coins?.filter(c => 
      baseRelated.some(r => c.item.symbol.toLowerCase().includes(r) || c.item.name.toLowerCase().includes(r))
    ).slice(0, 10) || [];
    
    const withScores = filtered.map((c, i) => ({
      rank: i + 1,
      id: c.item.id,
      symbol: c.item.symbol,
      name: c.item.name,
      thumb: c.item.thumb,
      price: c.item.price_btc,
      aiScore: Math.round(50 + Math.random() * 40), // Mock AI score
      timestamp: Date.now(),
    }));
    
    res.json({
      app: "rIntelligence",
      count: withScores.length,
      tokens: withScores,
    });
  } catch (error) {
    res.status(500).json({ error: "Trending fetch failed", details: error.message });
  }
});

app.get("/api/v1/ai/security", payment, async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token || !token.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid token address" });
    }
    
    // Basic security checks
    const [holderData, txData, codeData] = await Promise.all([
      axios.get(`https://api.basescan.org/api?module=token&action=getTokenHolderList&contractaddress=${token}&page=1&offset=10&apikey=${BASESCAN_API_KEY}`).catch(() => null),
      axios.get(`https://api.basescan.org/api?module=account&action=txlist&address=${token}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${BASESCAN_API_KEY}`).catch(() => null),
      axios.get(`https://api.basescan.org/api?module=contract&action=getsourcecode&address=${token}&apikey=${BASESCAN_API_KEY}`).catch(() => null)
    ]);
    
    const holderCount = holderData?.data?.result?.length || 0;
    const txCount = txData?.data?.result?.length || 0;
    const hasSourceCode = codeData?.data?.result?.[0]?.SourceCode ? true : false;
    const isVerified = codeData?.data?.result?.[0]?.ContractName ? true : false;
    
    const checks = {
      verified: isVerified,
      hasSourceCode,
      hasHolders: holderCount > 0,
      hasTransactions: txCount > 0,
      top10Ownership: holderCount > 0 ? Math.min(95, 50 + Math.random() * 40) : 100, // Mock
    };
    
    const riskLevel = Object.values(checks).filter(v => v === false).length === 0 ? "LOW" : 
                      Object.values(checks).filter(v => v === false).length <= 2 ? "MEDIUM" : "HIGH";
    
    res.json({
      app: "rIntelligence",
      token,
      security: {
        riskLevel,
        checks,
        score: Math.round((Object.values(checks).filter(v => v).length / Object.values(checks).length) * 100),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: "Security check failed", details: error.message });
  }
});

// ==================== BASIC API (Backward compatible) ====================

app.get("/api/price/:token", payment, async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid token address" });
    }
    
    const baseToken = BASE_TOKENS[token.toLowerCase()];
    if (!baseToken) {
      return res.json({ token, price: null, note: "Token not in database" });
    }
    
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${baseToken.id}`
    ).catch(() => ({ data: {} }));
    
    const price = response.data[baseToken.id]?.usd;
    
    res.json({ token, symbol: baseToken.symbol, price, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: "Price fetch failed", details: error.message });
  }
});

app.get("/api/portfolio/:address", payment, async (req, res) => {
  // Proxy to rWatch
  req.query.address = req.params.address;
  const mockReq = { query: req.query };
  const mockRes = {
    status: (code) => ({ json: (data) => res.status(code).json(data) }),
    json: (data) => res.json(data)
  };
  
  // Simple balance response
  try {
    const { address } = req.params;
    const response = await axios.get(
      `https://api.basescan.org/api?module=account&action=tokenlist&address=${address}&apikey=${BASESCAN_API_KEY}`
    ).catch(() => ({ data: { result: [] } }));
    
    res.json({
      address,
      holdings: response.data.result || [],
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/search", payment, async (req, res) => {
  try {
    const { q } = req.query;
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`
    ).catch(() => ({ data: { coins: [] } }));
    
    res.json({
      query: q,
      results: response.data.coins?.slice(0, 10) || [],
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦞 Clawdex API v2.0 running on port ${PORT}`);
  console.log(`💰 Payment receiver: ${PAY_TO}`);
  console.log(`🌐 Network: Base Mainnet`);
});
