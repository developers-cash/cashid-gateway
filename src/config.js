module.exports = {
  // General settings
  domain: process.env.DOMAIN || 'cashid.infra.cash',
  port: process.env.PORT || 8080,

  // OIDC Settings
  clientId: process.env.CLIENT_ID || 'cashid.infra.cash',
  clientSecret: process.env.CLIENT_SECRET || 'cashid.infra.cash',
  redirectURI: process.env.REDIRECT_URLS || 'https://public.instance', // Comma separated for multiple (https://public.instance is special and whitelists all)

  // Tweaking values
  accountTTL: process.env.ACCOUNT_TTL || 60,
  authTTL: process.env.AUTH_TTL || 60 * 15
}
