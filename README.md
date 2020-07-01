# CashID Gateway

This is a self-hosted OIDC Gateway for CashID.

Note that as CashID, by design, mitigates the need for third-party Identity Providers, this does not follow the full OIDC specification. It is intended as a stop-gap measure to ease the integration of CashID into existing services that already have OIDC support inbuilt. In essence, this is functioning more as an IdV (Identity Verification) service that validates the CashID payload as opposed to as a full IdP (Identity Provider) service. However, "Accounts" are stored temporarily (and in memory) on the server (default 60s) so that the OIDC "code" flow can take place.

A public instance is available for testing here:

```
Discovery Document:
https://cashid.infra.cash/oidc/.well-known/openid-configuration

Client ID:
cashid.infra.cash

Client Secret:
cashid.infra.cash
```

# Quick Start



```sh
git clone blahblahblah
cd blahblahblah
npm install
npm start
```

# Configuration

As this is intended to be run on a Docker Container, configuration is done via environment variables.

The following are the defaults:

```sh
# General Settings
DOMAIN=cashid.infra.cash # You MUST set this
PORT=8080 # Port that HTTP Server will run on

# OIDC Settings
CLIENT_ID=cashid.infra.cash
CLIENT_SECRET=cashid.infra.cash
REDIRECT_URLS=https://public.instance # (Comma separate for more than one)

# The following are Tweak variables
ACCOUNT_TTL=60 # Seconds that accounts remain in cache
AUTH_TTL=900 # Seconds that user has to authenticate (15m default)
```
