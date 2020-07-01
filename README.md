# CashID Gateway

This is a self-hosted OIDC Gateway for [CashID](https://gitlab.com/cashid/protocol-specification) built with NodeJS.

Note that as CashID, by design, mitigates the need for third-party Identity Providers, this does not follow the full OIDC specification. It is intended as a stop-gap measure to ease the integration of CashID into existing services that already have OIDC support inbuilt. In essence, this is functioning more as an IdV (Identity Verification) service that validates the CashID payload as opposed to as a full IdP (Identity Provider) service. However, "Accounts" are stored temporarily (and in memory) on the server (default 60s) so that the OIDC "code" flow can take place.

A public instance is available (with all redirect URL's whitelisted) below. Use this only for testing purposes.

```
Discovery Document:
https://cashid.infra.cash/oidc/.well-known/openid-configuration

Client ID:
cashid

Client Secret:
cashid
```

# Quick Start

Note that CashID, by specification, requires HTTPS. The below will run - but will not function correctly unless 

```sh
git https://github.com/developers-cash/cashid-gateway.git
cd cashid-gateway
npm install
DOMAIN=cashid.yourdomain.com npm start
```

# Configuration

As this is intended to be run on a Docker Container, configuration is done via environment variables.

The following are the defaults:

```sh
# General Settings
DOMAIN=cashid.infra.cash # You MUST change this to your domain
PORT=8080 # Port that HTTP Server will run on

# OIDC Settings
CLIENT_ID=cashid
CLIENT_SECRET=cashid
REDIRECT_URLS=https://public.instance # (Comma separate for more than one)
# Note that https://public.instance is a special value in that it will whitelist ALL URL's.
# Be sure to change this if you are running a Prod/Non-Test Instance.

# The following are variables that tweak the instance
ACCOUNT_TTL=60 # Seconds that accounts remain in cache
AUTH_TTL=900 # Seconds that user has to authenticate (15m default)
```

# Docker-Compose Example

The following is an example `docker-compose.yml` file configured to work with the [Traefik](https://traefik.io) reverse-proxy:

```yml
version: "3.1"

networks:
  traefik:
    external: true
  internal:
    external: false

services:
      
  cashid:
    image: "developerscash/cashid-gateway:0.1.0"
    restart: always
    environment:
      - NODE_ENV=production
      - DOMAIN=cashid.infra.cash # CHANGE ME TO YOUR DOMAIN
    labels:
      - traefik.frontend.rule=Host:cashid.infra.cash #CHANGE ME TO YOUR DOMAIN
      - traefik.docker.network=traefik
      - traefik.port=8080
      - traefik.frontend.passHostHeader=true
      - traefik.enable=true
    networks:
      - traefik
      - internal
```

# Roadmap/TODO List

1. Clean up code and create an OIDC Adapter that manages memory better.
2. Add an `api/request` endpoint to generate requests.
3. Create a corresponding JS library to leverage above.
