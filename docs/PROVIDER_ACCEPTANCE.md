# 5DollarFootballAPI — Provider Acceptance Record

**Status:** Adapter scaffolded; account activation and live API acceptance are pending.

## Selected $0 plan

Community Access is the target plan, not the paid Pro plan.

The provider's current public terms describe Community Access as:
- $0, no payment card required.
- Top five European leagues plus one selected country's top flight and, where priced, second division.
- Bet365 markets.
- Last 12 months of results and odds.
- 300 requests per hour, with a maximum of 20 per minute.
- Renewable every 12 months.
- No attribution requirement for private/internal use; attribution is required if data is shown in a public-facing product.
- Raw data must not be resold or redistributed as a competing feed.

Official references:
- [Community Access terms and activation](https://5dollarfootballapi.com/community)
- [Plan comparison](https://5dollarfootballapi.com/pricing)
- [API documentation](https://5dollarfootballapi.com/docs)
- [Measured data quality by competition](https://5dollarfootballapi.com/docs/data-quality)

## API contract used by the adapter

- Base URL: `https://api.5dollarfootballapi.com/v1`
- Authentication: `Authorization: Bearer <key>`
- Account plan and usage: `GET /status`
- Country catalogue: `GET /countries`
- Accessible competitions: `GET /leagues?include=seasons`
- Country-specific competitions: `GET /leagues?country=NG&include=seasons`
- Fixture window: `GET /fixtures?start_time=<unix>&end_time=<unix>&status=all`
- Historical league fixtures: `GET /leagues/{id}/fixtures?season=<season>`

Important constraints:
- `GET /fixtures` accepts windows no longer than 24 hours.
- League fixture history is available by season or time range; Community history is limited to the last 12 months.
- Pagination uses `page`, `per_page` and `pagination.has_more`.
- API timestamps are UTC.
- The response may include a `plan_league_scope` notice; an empty fixture window must not be interpreted as proof that the API is broken.
- The API identifies `finished` as the confirmed full-time state. `unknown` must never be auto-settled.
- Rate-limit headers and HTTP 429 / Retry-After must be respected.

## Nigeria coverage gate

Nigeria is the intended country pack, but it is not accepted as covered until all checks pass against the activated account.

1. `GET /status` reports Community Access.
2. `GET /leagues?country=NG&include=seasons` returns the expected Nigerian competitions.
3. The Nigerian Premier Football League and any included second division are present in the account's actual response.
4. Their current season values and historical seasons are returned.
5. Fixture and finished-result samples can be fetched and reconciled.
6. The response rate limits match the expected Community allowance.

**Important coverage uncertainty:** the public Community page says the selected country pack includes that country's top flight and, where priced, the second division. However, the separate public data-quality table labels Nigeria Premier League as Pro. The account-specific response must resolve this apparent plan/coverage discrepancy. Do not assume Nigeria Premier League access from the marketing description alone.

## Adapter implementation

- `src/lib/providers/fiveDollar/client.ts` — Bearer authentication, JSON envelope validation, pagination, rate-limit headers, and 429 error metadata.
- `src/lib/providers/fiveDollar/mapper.ts` — source-to-canonical fixture/result mapping.
- `src/lib/providers/fiveDollar/provider.ts` — plan status, league catalogue, 24-hour fixture windows, and historical league fixtures.
- Tests cover mapping, finished-result requirements, authentication, and rate-limit errors.

## Activation and secret handling

A human must create/sign in to the provider account, activate Community Access, and select the country pack. The API key must be stored as a server-side environment secret named `FOOTBALL_API_KEY`. Never put it in source code, a public client bundle, GitHub commits, screenshots, or chat messages.

No key has been received or used. No live API request has been made by PUNTER AI. Until the acceptance checks pass, this provider remains **configured in code but unverified in production**.
