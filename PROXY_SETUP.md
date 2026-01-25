# Proxy Configuration Examples

## Proxy Format

One proxy per line in the following formats:

```
# HTTP proxy
http://proxy.example.com:8080

# HTTP proxy with authentication
http://username:password@proxy.example.com:8080

# SOCKS5 proxy
socks5://proxy.example.com:1080

# SOCKS5 proxy with authentication
socks5://username:password@proxy.example.com:1080
```

## Example Proxy List

```
# Residential proxies (BEST for YouTube)
http://user1:pass1@residential-proxy-1.com:8080
http://user2:pass2@residential-proxy-2.com:8080
http://user3:pass3@residential-proxy-3.com:8080

# Mobile proxies (EXCELLENT for YouTube)
http://mobile-user:pass@4g-proxy-1.com:8080
http://mobile-user:pass@4g-proxy-2.com:8080

# ISP proxies (GOOD for YouTube)
http://isp-user:pass@isp-proxy-1.com:8080
http://isp-user:pass@isp-proxy-2.com:8080

# Datacenter proxies (USE WITH CAUTION - YouTube can detect these)
http://dc-proxy-1.com:8080
http://dc-proxy-2.com:8080
```

## Recommended Proxy Providers

### ✅ Best for YouTube Views/Subscribers:

1. **Residential Proxies:**
   - Bright Data (luminati.io) - Premium, expensive but best quality
   - Smartproxy.com - Good balance of price/quality
   - Oxylabs.io - High quality, good for large campaigns
   - GeoSurf.com - Good geo-targeting

2. **Mobile Proxies (4G/5G):**
   - Mobile Proxy Space - Dedicated 4G IPs
   - Proxy-Cheap - Affordable mobile proxies
   - IPBurger - 4G/5G residential
   - Soax.com - Mobile + residential mix

3. **ISP Proxies:**
   - HighProxies.com - Static ISP IPs
   - MyPrivateProxy - Dedicated ISP proxies

### ❌ Avoid for YouTube:

- Free proxies (public, already blacklisted)
- Datacenter proxies (AWS, GCP, Azure, DigitalOcean)
- Shared proxies (too many users, suspicious activity)
- VPN services (shared IPs, easy to detect)

## Proxy Rotation Strategy

### Small Campaign (100-500 views):
- **Proxy count:** 10-20 proxies
- **Views per proxy:** 5-10 views/day
- **Type:** Residential or Mobile

### Medium Campaign (500-5000 views):
- **Proxy count:** 50-100 proxies
- **Views per proxy:** 10-20 views/day
- **Type:** Residential or ISP

### Large Campaign (5000+ views):
- **Proxy count:** 200+ proxies
- **Views per proxy:** 20-30 views/day MAX
- **Type:** Mix of Residential + Mobile

## Testing Proxies

Before using proxies with YouTube, test them:

```bash
# Test proxy connectivity
curl --proxy http://user:pass@proxy.com:8080 https://www.google.com

# Test if proxy is detected as datacenter (should return residential)
curl --proxy http://user:pass@proxy.com:8080 https://ip.oxylabs.io/location

# Test YouTube access
curl --proxy http://user:pass@proxy.com:8080 https://www.youtube.com
```

## Important Notes

1. **Rotate proxies for each view** - Don't reuse same IP for multiple views
2. **Match geo to video** - US video → US proxies
3. **Monitor proxy health** - Replace dead/slow proxies
4. **Limit views per IP** - Max 5-10 views/IP/day is safe
5. **Use sessions** - Some providers offer session-based rotation

## Cost Estimate

| Type | Cost | Quality | Use Case |
|------|------|---------|----------|
| Residential | $10-15/GB | ⭐⭐⭐⭐⭐ | Best for YouTube |
| Mobile | $15-25/GB | ⭐⭐⭐⭐⭐ | Best for subscribers |
| ISP | $2-5/IP/month | ⭐⭐⭐⭐ | Good for large campaigns |
| Datacenter | $1-3/IP/month | ⭐⭐ | Risky, not recommended |

**Budget recommendation:**
- Small campaign (500 views): $50-100/month
- Medium campaign (5000 views): $200-500/month
- Large campaign (50000 views): $1000-2000/month

## Setup Instructions

1. **Get proxies from provider** (e.g., Bright Data, Smartproxy)

2. **Create proxy file:**
```bash
# Create proxies.txt
nano proxies.txt

# Add proxies (one per line)
http://user1:pass1@proxy1.provider.com:8080
http://user2:pass2@proxy2.provider.com:8080
...
```

3. **Use with API:**
```bash
curl -X POST http://localhost:3000/api/v1/watch/batch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://youtube.com/watch?v=xxx",
    "tabs": 100,
    "proxyFile": "/path/to/proxies.txt",
    "humanBehavior": true,
    "randomDuration": true,
    "batchSize": 5
  }'
```

## Troubleshooting

**Q: Proxy not working?**
- Check format (must include protocol: http:// or socks5://)
- Test with curl first
- Check username/password
- Verify proxy is not blocked by YouTube

**Q: All views from same IP?**
- Make sure proxy rotation is enabled
- Check if provider supports session rotation
- Use different proxies in proxyList

**Q: Proxies too slow?**
- Test proxy speed with curl
- Switch to faster provider
- Reduce concurrent tabs (batchSize)
- Use proxies closer to video's geo

**Q: Getting captchas?**
- Too many requests from same IP
- Use residential/mobile proxies instead of datacenter
- Reduce views per IP per day
- Add longer delays between requests
