# Web deployment

Sloka Steps uses `BrowserRouter`, so the browser base path, generated asset
URLs, and host fallback must agree. Root hosting is the default.

## Build for the host path

`VITE_BASE_PATH` is a public, non-secret, path-only build setting. It accepts
either `SlokaSteps` or `/SlokaSteps/` and normalizes both to `/SlokaSteps/`.
Full origins, query strings, fragments, backslashes, and path traversal are
rejected.

Root-domain build:

```powershell
$env:VITE_BASE_PATH = "/"
npm.cmd run build
```

GitHub project-page or another nested mount:

```powershell
$env:VITE_BASE_PATH = "/SlokaSteps/"
npm.cmd run build
```

The build setting drives all of the following:

- Vite JavaScript and CSS asset URLs
- the React Router `basename`
- public assets such as the favicon and audio manifest
- approved audio URLs resolved from the canonical `/audio/...` manifest values

Do not include the origin in `VITE_BASE_PATH`. For example, use
`/SlokaSteps/`, not `https://example.com/SlokaSteps/`.

## Required SPA fallback

The production host must serve the built `index.html` for an unknown
application route while leaving real files under `assets/`, `audio/`, and
other public paths untouched. Without this fallback, refreshing or directly
opening a route such as `/slokas/saraswati-namastubhyam` returns a host 404
before React can run.

The build copies `dist/index.html` to `dist/404.html`. This is the compatibility
fallback used by static hosts such as GitHub Pages. A host rewrite returning
HTTP 200 is preferred when available because a custom 404 page can still carry
an HTTP 404 status.

Examples:

```text
# Netlify-style rule for a nested mount
/SlokaSteps/*  /SlokaSteps/index.html  200
```

```nginx
# Nginx-style rule for a nested mount
location /SlokaSteps/ {
  try_files $uri $uri/ /SlokaSteps/index.html;
}
```

For root hosting, replace `/SlokaSteps/` with `/`. For GitHub Pages, deploy the
contents of `dist/` and keep `dist/404.html`; no server rewrite configuration
is available there.

## Release checks

After building:

1. Confirm `dist/index.html` and `dist/404.html` are byte-for-byte identical.
2. Confirm generated asset, favicon, and audio-manifest URLs begin with the
   configured base.
3. Serve `dist/` and open the configured base URL.
4. Directly open and refresh `/learn`, a sloka detail route, and `/practice`
   below that base.
5. Verify an existing file under `assets/` or `audio/` is served as a file and
   is not rewritten to the app shell.

Microphone practice also requires HTTPS outside localhost.
