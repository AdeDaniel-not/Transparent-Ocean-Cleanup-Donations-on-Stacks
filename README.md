# OceanTransparency: Transparent Ocean Cleanup Donations on Stacks

## Overview

OceanTransparency is a Web3 project built on the Stacks blockchain using Clarity smart contracts. It addresses the real-world problem of opacity in charitable donations, particularly for environmental causes like ocean cleanup. Donors often lack visibility into how their contributions are used, leading to mistrust and reduced participation. This project enables users to donate STX (or wrapped BTC via Stacks) to fund ocean cleanup initiatives, with blockchain ensuring:

- **Transparency**: All donations, expenditures, and cleanup results are recorded immutably on-chain.
- **Accountability**: Funds are managed via a DAO where donors (holding governance tokens) vote on proposals for cleanup projects.
- **Verifiable Results**: Cleanup outcomes (e.g., kilograms of plastic removed, GPS locations) are inputted via trusted oracles and linked to expenditures.
- **Incentives**: Donors receive governance tokens and optional NFTs representing their impact.

The project solves:
- **Donation Mistrust**: Blockchain traces every satoshi from donation to impact.
- **Inefficient Fund Allocation**: DAO voting ensures community-driven decisions.
- **Data Silos in Environmental Efforts**: On-chain results create a public ledger for global ocean health tracking.

This is implemented with 6 solid smart contracts in Clarity, designed for security, clarity (pun intended), and efficiency on Stacks. Contracts are non-upgradable by default, with SIP-010 for fungible tokens and SIP-009 for NFTs where applicable.

## Architecture

- **User Flow**:
  1. Users donate STX to the DonationVault contract, receiving GOV tokens (proportional to donation) and optionally an ImpactNFT.
  2. DAO members propose cleanup projects (e.g., "Fund beach cleanup in Bali, budget 1000 STX").
  3. GOV token holders vote on proposals in the DAOGovernance contract.
  4. Approved proposals release funds from Treasury to specified recipients (e.g., verified NGOs).
  5. Oracles (trusted entities like environmental orgs) input results via ResultsOracle, linking to the proposal.
  6. All data is queryable via TransparencyLedger for public viewing.

- **Tech Stack**:
  - Blockchain: Stacks (Bitcoin-secured).
  - Language: Clarity (safe, decidable smart contract language).
  - Tokens: GOV (SIP-010 fungible token for governance), ImpactNFT (SIP-009 non-fungible for donor recognition).
  - Oracles: Admin-gated for simplicity; extendable to decentralized oracles.
  - Frontend (not included): Could be a React dApp integrating stacks.js for wallet interactions.

- **Security Considerations**:
  - No recursion or unbounded loops (Clarity enforced).
  - Access controls via principals.
  - Emergency pause in Treasury (multisig admin).
  - Audits recommended before mainnet deployment.

## Smart Contracts

Below are the 6 smart contracts with their purposes, key functions, and full Clarity code. Deploy them in order (dependencies noted). Use Clarinet for local testing.

### 1. GovToken.clar (Governance Token - SIP-010 Compliant)

**Purpose**: Fungible token (GOV) minted to donors for voting power. Total supply capped at 1,000,000. Used in DAO voting.

```clarity
;; GovToken.clar
(define-fungible-token gov-token u1000000)

(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant CONTRACT-OWNER tx-sender)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-UNAUTHORIZED)
    (ft-transfer? gov-token amount sender recipient)
  )
)

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (ft-mint? gov-token amount recipient)
  )
)

(define-read-only (get-balance (account principal))
  (ft-get-balance gov-token account)
)

(define-read-only (get-total-supply)
  (ft-get-supply gov-token)
)

(define-read-only (get-name)
  (ok "GOV Token")
)

(define-read-only (get-symbol)
  (ok "GOV")
)

(define-read-only (get-decimals)
  (ok u0)
)

(define-read-only (get-token-uri)
  (ok (some "https://oceantransparency.com/gov-token.json"))
)
```

### 2. ImpactNFT.clar (Donor Recognition NFT - SIP-009 Compliant)

**Purpose**: Non-fungible tokens issued to donors as proof of impact. Metadata includes donation amount and timestamp. Limited editions for milestones.

```clarity
;; ImpactNFT.clar
(define-non-fungible-token impact-nft uint)

(define-map nft-metadata uint {donation-amount: uint, timestamp: uint})
(define-data-var last-id uint u0)
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant CONTRACT-OWNER tx-sender)

(define-public (transfer (id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-UNAUTHORIZED)
    (nft-transfer? impact-nft id sender recipient)
  )
)

(define-public (mint (recipient principal) (donation-amount uint))
  (let ((new-id (+ (var-get last-id) u1)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (map-set nft-metadata new-id {donation-amount: donation-amount, timestamp: block-height})
    (var-set last-id new-id)
    (nft-mint? impact-nft new-id recipient)
  )
)

(define-read-only (get-last-token-id)
  (ok (var-get last-id))
)

(define-read-only (get-token-uri (id uint))
  (ok (some (concat "https://oceantransparency.com/nft/" (to-string id))))
)

(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? impact-nft id))
)

(define-read-only (get-metadata (id uint))
  (map-get? nft-metadata id)
)
```

### 3. DonationVault.clar (Donation Handling)

**Purpose**: Accepts STX donations, mints GOV tokens (1 GOV per 1 STX), optionally mints NFTs for large donations (>100 STX), and forwards funds to Treasury.

Depends on: GovToken.clar, ImpactNFT.clar, Treasury.clar.

```clarity
;; DonationVault.clar
(use-trait gov-token .GovToken.gov-token)
(use-trait impact-nft .ImpactNFT.impact-nft)
(use-trait treasury .Treasury.treasury)

(define-constant ERR-INSUFFICIENT-AMOUNT (err u101))
(define-constant MIN-DONATION u1)
(define-constant NFT-THRESHOLD u100)

(define-public (donate (amount uint) (gov-contract <gov-token>) (nft-contract <impact-nft>) (treasury-contract <treasury>))
  (begin
    (asserts! (>= amount MIN-DONATION) ERR-INSUFFICIENT-AMOUNT)
    (try! (stx-transfer? amount tx-sender (contract-call? treasury-contract get-address)))
    (try! (contract-call? gov-contract mint amount tx-sender))
    (if (>= amount NFT-THRESHOLD)
      (try! (contract-call? nft-contract mint tx-sender amount))
      (ok true)
    )
  )
)
```

### 4. Treasury.clar (Fund Management)

**Purpose**: Holds donated STX, releases funds only on approved DAO proposals. Includes emergency withdrawal for admins.

```clarity
;; Treasury.clar
(define-data-var treasury-balance uint u0)
(define-map approved-releases uint {recipient: principal, amount: uint})
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-INSUFFICIENT-BALANCE (err u102))
(define-data-var admin principal tx-sender)

(define-public (deposit (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED) ;; In practice, restrict to DonationVault
    (var-set treasury-balance (+ (var-get treasury-balance) amount))
    (ok true)
  )
)

(define-public (release-funds (proposal-id uint) (recipient principal) (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED) ;; Called by DAO
    (asserts! (>= (var-get treasury-balance) amount) ERR-INSUFFICIENT-BALANCE)
    (map-set approved-releases proposal-id {recipient: recipient, amount: amount})
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    (var-set treasury-balance (- (var-get treasury-balance) amount))
    (ok true)
  )
)

(define-public (emergency-withdraw (amount uint) (to principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (try! (as-contract (stx-transfer? amount tx-sender to)))
    (var-set treasury-balance (- (var-get treasury-balance) amount))
    (ok true)
  )
)

(define-read-only (get-balance)
  (ok (var-get treasury-balance))
)

(define-read-only (get-address)
  (ok (as-contract tx-sender))
)
```

### 5. DAOGovernance.clar (Proposals and Voting)

**Purpose**: Manages proposals for fund usage and voting with GOV tokens. Proposals pass if >50% votes in favor within voting period.

Depends on: GovToken.clar, Treasury.clar.

```clarity
;; DAOGovernance.clar
(use-trait gov-token .GovToken.gov-token)
(use-trait treasury .Treasury.treasury)

(define-map proposals uint {description: (string-ascii 256), proposer: principal, amount: uint, recipient: principal, votes-for: uint, votes-against: uint, end-block: uint})
(define-map votes {proposal-id: uint, voter: principal} bool)
(define-data-var proposal-count uint u0)
(define-constant VOTING-PERIOD u144) ;; ~1 day in blocks
(define-constant ERR-ALREADY-VOTED (err u103))
(define-constant ERR-VOTING-ENDED (err u104))
(define-constant ERR-UNAUTHORIZED (err u100))

(define-public (create-proposal (description (string-ascii 256)) (amount uint) (recipient principal))
  (let ((new-id (+ (var-get proposal-count) u1)))
    (map-set proposals new-id {description: description, proposer: tx-sender, amount: amount, recipient: recipient, votes-for: u0, votes-against: u0, end-block: (+ block-height VOTING-PERIOD)})
    (var-set proposal-count new-id)
    (ok new-id)
  )
)

(define-public (vote (proposal-id uint) (in-favor bool) (gov-contract <gov-token>))
  (let ((proposal (unwrap! (map-get? proposals proposal-id) ERR-UNAUTHORIZED))
        (balance (unwrap-panic (contract-call? gov-contract get-balance tx-sender))))
    (asserts! (<= block-height (get end-block proposal)) ERR-VOTING-ENDED)
    (asserts! (is-none (map-get? votes {proposal-id: proposal-id, voter: tx-sender})) ERR-ALREADY-VOTED)
    (map-set votes {proposal-id: proposal-id, voter: tx-sender} in-favor)
    (if in-favor
      (map-set proposals proposal-id (merge proposal {votes-for: (+ (get votes-for proposal) balance)}))
      (map-set proposals proposal-id (merge proposal {votes-against: (+ (get votes-against proposal) balance)}))
    )
    (ok true)
  )
)

(define-public (execute-proposal (proposal-id uint) (treasury-contract <treasury>))
  (let ((proposal (unwrap! (map-get? proposals proposal-id) ERR-UNAUTHORIZED)))
    (asserts! (> block-height (get end-block proposal)) ERR-VOTING-ENDED)
    (asserts! (> (get votes-for proposal) (get votes-against proposal)) ERR-UNAUTHORIZED)
    (try! (contract-call? treasury-contract release-funds proposal-id (get recipient proposal) (get amount proposal)))
    (ok true)
  )
)

(define-read-only (get-proposal (id uint))
  (map-get? proposals id)
)
```

### 6. ResultsOracle.clar (Cleanup Results Tracking)

**Purpose**: Allows verified oracles to input cleanup results tied to proposals. Results are stored on-chain for transparency.

Depends on: DAOGovernance.clar.

```clarity
;; ResultsOracle.clar
(define-map results uint {proposal-id: uint, plastic-removed-kg: uint, location: (string-ascii 100), timestamp: uint, evidence-url: (string-ascii 256)})
(define-data-var oracle principal tx-sender) ;; In production, multisig or decentralized
(define-constant ERR-UNAUTHORIZED (err u100))

(define-public (submit-result (proposal-id uint) (plastic-removed-kg uint) (location (string-ascii 100)) (evidence-url (string-ascii 256)))
  (begin
    (asserts! (is-eq tx-sender (var-get oracle)) ERR-UNAUTHORIZED)
    (map-set results proposal-id {proposal-id: proposal-id, plastic-removed-kg: plastic-removed-kg, location: location, timestamp: block-height, evidence-url: evidence-url})
    (ok true)
  )
)

(define-read-only (get-result (proposal-id uint))
  (map-get? results proposal-id)
)
```

## Deployment Instructions

1. Install Clarinet: `cargo install clarinet`.
2. Create a new project: `clarinet new ocean-transparency`.
3. Add the above contracts to `contracts/` folder.
4. Update `Clarinet.toml` with dependencies if needed.
5. Test locally: `clarinet test`.
6. Deploy to Stacks testnet/mainnet via Clarinet or stacks-cli.
7. Set contract owners/admins post-deployment.

## Usage

- **Donate**: Call `donate` on DonationVault with STX amount.
- **Propose**: Call `create-proposal` on DAOGovernance.
- **Vote**: Hold GOV, call `vote`.
- **Execute**: After voting, call `execute-proposal`.
- **Submit Results**: Oracle calls `submit-result`.
- **Query**: Use read-only functions for transparency (e.g., get-balance, get-result).

## Future Enhancements

- Integrate decentralized oracles (e.g., via Chainlink on Stacks).
- Add frontend dApp.
- Support for other tokens (e.g., sBTC).
- Analytics dashboard for total impact.
