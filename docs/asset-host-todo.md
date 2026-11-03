# Asset host to-do

The public file host is `https://assets.rokdesk.app`. The bucket is `rok-assets` on Cloudflare R2. The desk code that reads it is on the `fgc-control` branch, not on main, and it is not in a release yet.

Do this on a computer with tens of gigabytes free. Do not paste the R2 keys into chat.

## Done

- [x] Cloudflare account, free plan. R2 is pay-as-you-go on that plan, not the $20 Pro plan.
- [x] Bucket `rok-assets`.
- [x] Domain `rokdesk.app` registered and active as a site in the same account.
- [x] Custom domain `assets.rokdesk.app` connected to the bucket. Status Active, TLS 1.2.
- [x] CORS on the bucket: origins `*`, methods `GET` and `HEAD`, headers `*`.

## Still to do

- [ ] Install Git and rclone on the computer that will upload.
- [ ] In Cloudflare, open R2, then Manage R2 API tokens. Create a token that can read and write objects in `rok-assets` only. Save the Access Key ID, the Secret Access Key, and the Account ID. The secret is shown once.
- [ ] Run `rclone config`. New remote named `r2`, storage S3, provider Cloudflare. Paste the two keys. Region `auto`. Endpoint `https://ACCOUNT_ID.r2.cloudflarestorage.com`.
- [ ] Download the packs. This is the StreamHelperAssets library, not a ROK Desk download.

```powershell
git clone --depth 1 --filter=blob:none --sparse https://github.com/joaorb64/StreamHelperAssets.git
cd StreamHelperAssets
git sparse-checkout set --no-cone assets.json "games/*/website" "games/*/full" "games/*/portrait" "games/*/vs_renders" "games/*/mural_art" "games/*/webm" "games/*/stage_icon" "games/*/base_files"
```

- [ ] Upload them in the names the desk reads.

```powershell
rclone copyto .\assets.json r2:rok-assets/catalog.json
rclone copy .\games r2:rok-assets/games --transfers 16
Get-ChildItem .\games -Directory | ForEach-Object {
  $config = "$($_.FullName)\base_files\config.json"
  if (Test-Path $config) {
    rclone copyto $config "r2:rok-assets/games/$($_.Name)/library.json"
  }
}
```

- [ ] Open `https://assets.rokdesk.app/catalog.json` and confirm the game list loads.
- [ ] Merge `fgc-control` and ship a desk build. Download assets in that build pulls website, full, portrait, versus renders, mural art, webm, and stage icons from the host and keeps them on that computer.
- [ ] On a game that was downloaded before this change, use Update so the extra packs are saved.

## What the desk reads

| In the bucket | Source file |
|---|---|
| `catalog.json` | `assets.json` |
| `games/{code}/library.json` | `games/{code}/base_files/config.json` |
| `games/{code}/website/` | same folder, including its `config.json` |
| `games/{code}/full/` | same |
| `games/{code}/portrait/` | same |
| `games/{code}/vs_renders/` | same |
| `games/{code}/mural_art/` | same |
| `games/{code}/webm/` | same |
| `games/{code}/stage_icon/` | same |

Each pack folder's `config.json` tells the desk the filename prefix and postfix. Smash Ultimate with the versus renders is several gigabytes.
