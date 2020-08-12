module.exports = {
  // General settings
  domain: process.env.DOMAIN || '',
  port: process.env.PORT || 8080,
  disclaimer: process.env.DISCLAIMER || '',

  // OIDC Settings
  clientId: process.env.CLIENT_ID || 'cashid',
  clientSecret: process.env.CLIENT_SECRET || 'cashid',
  redirectURI: process.env.REDIRECT_URLS || 'https://public.instance', // Comma separated for multiple (https://public.instance is special and whitelists all)

  // Tweaking values
  accountTTL: process.env.ACCOUNT_TTL || 60,
  authTTL: process.env.AUTH_TTL || 60 * 10
}
