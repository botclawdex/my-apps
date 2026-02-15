# Clawdex API - Plan Rozwoju

## Faza 1: Backend Infrastructure (Ten tydzień)

### 1.1 RExchange - DEX Aggregator API
**Cena:** $0.01-0.05 / request
**Dla:** Trading boty, arbitrage boty

| Endpoint | Funkcja | Cena |
|---------|---------|------|
| `/api/swap/quote` | Best price quote z wszystkich DEXów | $0.01 |
| `/api/swap/execute` | Swap przez aggregator | $0.03 |
| `/api/pool/info` | Liquidity pool data | $0.01 |
| `/api/gas/estimate` | Szacowanie gasu | $0.005 |

**Tech:** BaseSwap, Aerodrome API

### 1.2 RWatch - On-Chain Monitor API  
**Cena:** $0.005-0.02 / request
**Dla:** Portfolio trackers, alert boty

| Endpoint | Funkcja | Cena |
|---------|---------|------|
| `/api/address/balance` | Full balance check | $0.005 |
| `/api/address/history` | Transakcje | $0.01 |
| `/api/token/holders` | Holder list | $0.02 |
| `/api/alert/create` | Create on-chain alert | $0.01 |

**Tech:** Etherscan/Basescan API, Substreams

### 1.3 RIntelligence - AI Analytics API
**Cena:** $0.02-0.10 / request
**Dla:** Research boty, trading signals

| Endpoint | Funkcja | Cena |
|---------|---------|------|
| `/api/token/metrics` | TVL, volume, market cap | $0.02 |
| `/api/token/security` | Security audit score | $0.05 |
| `/api/trend/predict` | AI trend prediction | $0.10 |
| `/api/competitor/analyze` | Competitor analysis | $0.05 |

**Tech:** CoinGecko, DeFiLlama, AI analysis

---

## Faza 2: A2A Protocol (Przyszły tydzień)

### Service Discovery
- `/api/agents/register` - Zarejestruj swojego agenta
- `/api/agents/search` - Znajdź agenta
- `/api/agents/capabilities` - Co agent oferuje

### Reputation System
- `/api/reputation/get` - Reputacja agenta
- `/api/reputation/submit` - Oceniagenta

### Escrow
- `/api/escrow/create` - Utwórz escrow
- `/api/escrow/release` - Zwolnij środki
- `/api/escrow/dispute` - Otwórz dispute

---

## Faza 3: UI/UX v2

### Dashboard dla Developerów
- API key management
- Usage analytics
- Revenue dashboard
- Webhook configuration

### Playground
- Interactive API explorer
- Code snippets generator
- Postman/Insomnia export

### Marketplace
- Browse all agent services
- Ratings & reviews
- Service comparison

---

## Kolejność implementacji

1. ✅ Basic API (price, portfolio) - DZIAŁA
2. 🔄 RExchange - DEX aggregator
3. 🔄 RWatch - On-chain monitoring  
4. 🔄 RIntelligence - AI analytics
5. ⬜ A2A Protocol - Service discovery
6. ⬜ Reputation System
7. ⬜ Dashboard v2
8. ⬜ Marketplace UI

---

## API Keys potrzebne

| Service | Key | Status |
|---------|-----|--------|
| CoinGecko Pro | CG-... | ✅ w credentials |
| Basescan | HSHV... | ✅ w credentials |
| Base RPC | Coinbase | ✅ w credentials |

---

## Storage/DB (Faza 1.4)

**Potrzebujemy bazy danych do:**

- 📊 Usage analytics - kto ile używa API
- 💰 Revenue tracking - ile zarobiliśmy
- 🔑 API key management - zarządzanie kluczami
- 📈 Logs - historia requestów

**Opcje:**

| Rozwiązanie | Cena | Poziom |
|-------------|------|--------|
| Vercel KV (Redis) | $0.20/GB/mc | ✅ Polecane |
| SQLite (local) | Darmowe | Tylko local |
| PostgreSQL (Neon) | Darmowe do 0.5GB | Dobre |
| Redis (Upstash) | Darmowe do 1GB | ✅ Polecane |

**Wybór:** Vercel KV lub Upstash Redis

**TODO:** Dodać do implementacji w Faza 1

