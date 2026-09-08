# Deploy

Target: your Ubuntu host at 192.168.1.102, reached from anywhere through a Cloudflare
Tunnel with Access in front. Nothing is published to the LAN; the tunnel is the only door.

## Memory budget

16 GB total, roughly half already in use. The stack fits in what's left with room for
one lab:

| Service | Limit |
|---|---|
| app | 512 MB |
| guacd | 256 MB |
| guacamole | 512 MB |
| guacdb (postgres) | 256 MB |
| cloudflared | 128 MB |
| **stack total** | **~1.6 GB** |
| one lab | ~1 GB |

Limits are set in `docker-compose.yml`. Run one lab at a time and tear it down. If you
later want Splunk or a full Elastic stack on this box, that is 4–8 GB on its own — it will
not coexist with a lab and the platform. Run those as their own lab, alone.

## First run

```bash
git clone <your-repo> /opt/cysa && cd /opt/cysa
cp .env.example .env          # fill in TUNNEL_TOKEN and GUAC_DB_PASSWORD
docker compose up -d --build
docker compose exec app node scripts/seed.js   # or: npm run seed on the host
```

## Cloudflare Tunnel and Access

1. Zero Trust dashboard → Networks → Tunnels → create a tunnel. Copy the token into
   `.env` as `TUNNEL_TOKEN`.
2. Add two public hostnames on the tunnel:
   - `study.yourdomain` → `http://app:3000`
   - `console.yourdomain` → `http://guacamole:8080/guacamole`
3. Zero Trust → Access → Applications → add both hostnames as self-hosted applications.
   Policy: allow your email address only. This is what stands between the internet and a
   remote console into your lab network, so do it before the first `docker compose up`,
   not after.
4. Set `CONSOLE_URL=https://console.yourdomain` in `.env` so the console embeds in the
   Labs page.

Guacamole is configured with `REMOTE_IP_VALVE_ENABLED` because Access has already
authenticated the request at the edge. Guacamole's own login still applies — change the
default `guacadmin` password on first login.

## Backups

```bash
crontab -e
0 3 * * * cd /opt/cysa && /usr/bin/npm run backup >> /var/log/cysa-backup.log 2>&1
```

Uses SQLite's online backup API, so it is safe while the app is running. Keeps 30 days in
`data/backups/`. Your progress and notes live in `data/study.db` — content is regenerable
from `content/`, that database is not.

## Public repo warning

The repo is public. Three things must never land in it:

- `.env` — tunnel token and database password. Already gitignored.
- The CompTIA objectives PDF, or any commercial study material. Copyrighted.
- `data/*.db` — your progress, and there is no reason for it to be public.

`.gitignore` covers all three. Check `git status` before your first push anyway.
