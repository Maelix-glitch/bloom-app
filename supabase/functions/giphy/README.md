# GIPHY edge function

Proxy for the story editor's GIF and sticker trays. The GIPHY key lives here as
a Supabase secret — it must never be a `VITE_` client env, because Vite inlines
those into the browser bundle.

The app calls it through `supabase.functions.invoke("giphy", …)`. If the
function is missing or the secret isn't set, both trays stay empty. There is
no substitute catalog.

## Deploy

```bash
supabase functions deploy giphy
supabase secrets set GIPHY_API_KEY=your-giphy-key
```

Get a key at https://developers.giphy.com (dashboard, "Create an App"). One
key covers both `/v1/gifs` and `/v1/stickers`.

## Contract

Request body:

| field      | type                       | meaning                   |
| ---------- | -------------------------- | ------------------------- |
| `catalog`  | `"gifs"` \| `"stickers"`   | which GIPHY collection    |
| `endpoint` | `"trending"` \| `"search"` | list vs query             |
| `q`        | string                     | search text (search only) |
| `limit`    | number                     | 1–24                      |

Response: `{ "data": GiphyResult[] }`. The API key is never returned. Anything
non-2xx, or a missing secret, is treated as an empty catalog by the client.

## Privacy

No user content is sent — only a search string (when searching) and a catalog
choice. Nothing is read from or written to the database here.
