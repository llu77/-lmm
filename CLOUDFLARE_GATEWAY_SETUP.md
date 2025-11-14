# Cloudflare Zero Trust Gateway Configuration

This document describes the Cloudflare Zero Trust Gateway setup for DNS filtering and security.

## Gateway Information

- **Gateway ID**: `3c9bde8186fe4c868defcc441f28ca5e`
- **Gateway Domain**: `xnoojzri3g.cloudflare-gateway.com`
- **DNS-over-HTTPS Endpoint**: `https://xnoojzri3g.cloudflare-gateway.com/dns-query`

## Network Endpoints

### IPv4
- **Enabled**: No
- **Address**: `172.64.36.1`

### IPv6
- **Enabled**: Yes
- **Address**: `2a06:98c1:54::20:bbc0`

## Configuration Files

The gateway configuration is available in the following files:

1. **cloudflare-gateway-config.json** - JSON configuration file with all gateway settings
2. **wrangler.toml** - Environment variables for the gateway configuration
3. **wrangler.jsonc** - Alternative configuration with gateway variables

## Environment Variables

The following environment variables are configured for the Cloudflare Gateway:

```bash
CLOUDFLARE_GATEWAY_ID="3c9bde8186fe4c868defcc441f28ca5e"
CLOUDFLARE_GATEWAY_DOMAIN="xnoojzri3g.cloudflare-gateway.com"
CLOUDFLARE_GATEWAY_DOH="https://xnoojzri3g.cloudflare-gateway.com/dns-query"
CLOUDFLARE_GATEWAY_IPV4="172.64.36.1"
CLOUDFLARE_GATEWAY_IPV6="2a06:98c1:54::20:bbc0"
```

## Usage

### DNS-over-HTTPS

To use the DNS-over-HTTPS endpoint in your applications:

```javascript
const dohEndpoint = 'https://xnoojzri3g.cloudflare-gateway.com/dns-query';

// Example: Fetch DNS record
const response = await fetch(`${dohEndpoint}?name=example.com&type=A`, {
  headers: {
    'Accept': 'application/dns-json'
  }
});
```

### Worker Integration

The gateway configuration is available in your Cloudflare Workers through environment variables:

```typescript
interface Env {
  CLOUDFLARE_GATEWAY_ID: string;
  CLOUDFLARE_GATEWAY_DOMAIN: string;
  CLOUDFLARE_GATEWAY_DOH: string;
  CLOUDFLARE_GATEWAY_IPV4: string;
  CLOUDFLARE_GATEWAY_IPV6: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Access gateway configuration
    const gatewayDomain = env.CLOUDFLARE_GATEWAY_DOMAIN;
    const dohEndpoint = env.CLOUDFLARE_GATEWAY_DOH;
    
    // Use in your worker logic
    // ...
  }
}
```

## Resources

- [Cloudflare Zero Trust Gateway Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/user-side-certificates/)
- [DNS-over-HTTPS (DoH) Documentation](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/)
- [Cloudflare Gateway Policies](https://developers.cloudflare.com/cloudflare-one/policies/gateway/)
