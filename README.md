# Moleptio

Mobile group-buy marketplace prototype, settled on Solana.

Moleptio explores a simple idea: **group buys feel safer when the “money logic” is transparent and auditable**. Today this repo ships a devnet demo where every action is wallet-signed and visible.

## What Moleptio does

- Browse group-buy campaigns (price, threshold, deadline)
- Join a campaign via a **Phantom-approved Solana devnet transaction**
- Track campaign lifecycle statuses (open → ended/expired → next steps)
- Fund your Solana wallet using **LI.FI cross-chain routing for USDC** (quote/route is real)

## Demo truth (what’s real vs planned)

**Solana joins (real signing, placeholder settlement):**

- Joining a campaign signs a Solana devnet transaction using `SystemProgram.transfer`.
- In the current demo this is implemented as a **self-transfer placeholder** so you can clearly see the amount you are approving.
- Escrow, settlement, and refunds are **planned** (not live yet).

**LI.FI bridging (real quote/route, demo execution):**

- We fetch real routes using LI.FI REST `POST https://li.quest/v1/advanced/routes`.
- In Expo Go we do **not** have an EVM wallet/signer, so “execute” is simulated and stored as a logical receipt.

## Tech stack

- Expo SDK 54 + React Native + `expo-router`
- Solana: `@solana/web3.js` + Phantom deep-link signing (devnet)
- State: Zustand + AsyncStorage persistence
- LI.FI: REST (li.quest v1)

## Quick start

Requirements: Node.js + npm.

```bash
npm install
npx expo start
```

## Android builds (EAS)

This repo includes EAS build profiles:

- `preview` → Android APK (internal distribution)
- `production` → Android AAB

Typical usage:

```bash
npm i -g eas-cli
eas login

eas build -p android --profile preview
# or
eas build -p android --profile production
```

## Submission quick facts

- Smart Contract / Program Address (planned Program ID):
   - `8mmpotBBTuLKpYKk5yPNfBu7xrc359r1VDuTJd9U2TAS`
   - Note: This is a generated Program ID for submission purposes; it is **not deployed** yet.
- Current on-chain program used by the demo join tx: Solana System Program
   - `11111111111111111111111111111111`
- Android package: `com.dev3pack.moleptio`

## Generate a Program Address (if required)

If a submission form requires a “Program Address”, you can generate a stable Program ID (a keypair pubkey) and keep the keypair locally.

```bash
node scripts/generate-program-id.js --out .secrets/escrow-program-keypair.json
```

- The command prints the Program ID to stdout.
- `.secrets/` is ignored by git.

## Repo map

- `app/` — screens (expo-router)
- `services/solana/` — join transaction building & send
- `services/lifi/` — LI.FI REST route quoting + demo execution receipt
- `services/campaigns/` — campaign store, seed data, lifecycle derivation
- `services/wallet/` — wallet session + local crypto/storage helpers
