(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-MAX-MEMBERS u101)
(define-constant ERR-INVALID-CONTRIB-AMOUNT u102)
(define-constant ERR-INVALID-CYCLE-DUR u103)
(define-constant ERR-INVALID-PENALTY-RATE u104)
(define-constant ERR-INVALID-VOTING-THRESHOLD u105)
(define-constant ERR-GROUP-ALREADY-EXISTS u106)
(define-constant ERR-GROUP-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-CONTRIB u110)
(define-constant ERR-INVALID-MAX-LOAN u111)
(define-constant ERR-GROUP-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-GROUPS-EXCEEDED u114)
(define-constant ERR-INVALID-GROUP-TYPE u115)
(define-constant ERR-INVALID-INTEREST-RATE u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-STATUS u120)

(define-data-var next-group-id uint u0)
(define-data-var max-groups uint u1000)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)

(define-map groups
  uint
  {
    name: (string-utf8 100),
    max-members: uint,
    contrib-amount: uint,
    cycle-duration: uint,
    penalty-rate: uint,
    voting-threshold: uint,
    timestamp: uint,
    creator: principal,
    group-type: (string-utf8 50),
    interest-rate: uint,
    grace-period: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool,
    min-contrib: uint,
    max-loan: uint
  }
)

(define-map groups-by-name
  (string-utf8 100)
  uint)

(define-map group-updates
  uint
  {
    update-name: (string-utf8 100),
    update-max-members: uint,
    update-contrib-amount: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-group (id uint))
  (map-get? groups id)
)

(define-read-only (get-group-updates (id uint))
  (map-get? group-updates id)
)

(define-read-only (is-group-registered (name (string-utf8 100)))
  (is-some (map-get? groups-by-name name))
)

(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)

(define-private (validate-max-members (members uint))
  (if (and (> members u0) (<= members u50))
      (ok true)
      (err ERR-INVALID-MAX-MEMBERS))
)

(define-private (validate-contrib-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-CONTRIB-AMOUNT))
)

(define-private (validate-cycle-duration (duration uint))
  (if (> duration u0)
      (ok true)
      (err ERR-INVALID-CYCLE-DUR))
)

(define-private (validate-penalty-rate (rate uint))
  (if (<= rate u100)
      (ok true)
      (err ERR-INVALID-PENALTY-RATE))
)

(define-private (validate-voting-threshold (threshold uint))
  (if (and (> threshold u0) (<= threshold u100))
      (ok true)
      (err ERR-INVALID-VOTING-THRESHOLD))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-group-type (type (string-utf8 50)))
  (if (or (is-eq type "rural") (is-eq type "urban") (is-eq type "community"))
      (ok true)
      (err ERR-INVALID-GROUP-TYPE))
)

(define-private (validate-interest-rate (rate uint))
  (if (<= rate u20)
      (ok true)
      (err ERR-INVALID-INTEREST-RATE))
)

(define-private (validate-grace-period (period uint))
  (if (<= period u30)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-contrib (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-CONTRIB))
)

(define-private (validate-max-loan (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-LOAN))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-groups (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-MAX-GROUPS))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-groups new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-group
  (group-name (string-utf8 100))
  (max-members uint)
  (contrib-amount uint)
  (cycle-duration uint)
  (penalty-rate uint)
  (voting-threshold uint)
  (group-type (string-utf8 50))
  (interest-rate uint)
  (grace-period uint)
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-contrib uint)
  (max-loan uint)
)
  (let (
        (next-id (var-get next-group-id))
        (current-max (var-get max-groups))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-GROUPS-EXCEEDED))
    (try! (validate-name group-name))
    (try! (validate-max-members max-members))
    (try! (validate-contrib-amount contrib-amount))
    (try! (validate-cycle-duration cycle-duration))
    (try! (validate-penalty-rate penalty-rate))
    (try! (validate-voting-threshold voting-threshold))
    (try! (validate-group-type group-type))
    (try! (validate-interest-rate interest-rate))
    (try! (validate-grace-period grace-period))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-contrib min-contrib))
    (try! (validate-max-loan max-loan))
    (asserts! (is-none (map-get? groups-by-name group-name)) (err ERR-GROUP-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set groups next-id
      {
        name: group-name,
        max-members: max-members,
        contrib-amount: contrib-amount,
        cycle-duration: cycle-duration,
        penalty-rate: penalty-rate,
        voting-threshold: voting-threshold,
        timestamp: block-height,
        creator: tx-sender,
        group-type: group-type,
        interest-rate: interest-rate,
        grace-period: grace-period,
        location: location,
        currency: currency,
        status: true,
        min-contrib: min-contrib,
        max-loan: max-loan
      }
    )
    (map-set groups-by-name group-name next-id)
    (var-set next-group-id (+ next-id u1))
    (print { event: "group-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-group
  (group-id uint)
  (update-name (string-utf8 100))
  (update-max-members uint)
  (update-contrib-amount uint)
)
  (let ((group (map-get? groups group-id)))
    (match group
      g
        (begin
          (asserts! (is-eq (get creator g) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-max-members update-max-members))
          (try! (validate-contrib-amount update-contrib-amount))
          (let ((existing (map-get? groups-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id group-id) (err ERR-GROUP-ALREADY-EXISTS))
              (begin true) 
            )
          )
          (let ((old-name (get name g)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete groups-by-name old-name)
                  (map-set groups-by-name update-name group-id)
                  (ok true)
                )
            )
          )
          (map-set groups group-id
            {
              name: update-name,
              max-members: update-max-members,
              contrib-amount: update-contrib-amount,
              cycle-duration: (get cycle-duration g),
              penalty-rate: (get penalty-rate g),
              voting-threshold: (get voting-threshold g),
              timestamp: block-height,
              creator: (get creator g),
              group-type: (get group-type g),
              interest-rate: (get interest-rate g),
              grace-period: (get grace-period g),
              location: (get location g),
              currency: (get currency g),
              status: (get status g),
              min-contrib: (get min-contrib g),
              max-loan: (get max-loan g)
            }
          )
          (map-set group-updates group-id
            {
              update-name: update-name,
              update-max-members: update-max-members,
              update-contrib-amount: update-contrib-amount,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "group-updated", id: group-id })
          (ok true)
        )
      (err ERR-GROUP-NOT-FOUND)
    )
  )
)

(define-public (get-group-count)
  (ok (var-get next-group-id))
)

(define-public (check-group-existence (name (string-utf8 100)))
  (ok (is-group-registered name))
)