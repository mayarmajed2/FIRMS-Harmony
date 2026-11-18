# Deployment Guide

Because **Fire Harmony** is a pure static web application (`index.html`, `css/`, `js/`, `assets/`), it can be deployed to any static hosting platform or CDN with zero build configuration.

---

## 1. Files Required for Deployment

Only the runtime web assets need to be published (documentation and git metadata are not required at runtime):

```text
index.html
assets/
  ├── logo.svg
  └── nile-night.jpg
css/
  └── styles.css
js/
  ├── about.js
  ├── analytics.js
  ├── data.js
  ├── hero.js
  ├── home.js
  ├── i18n.js
  ├── map.js
  ├── methodology.js
  ├── router.js
  ├── sensors.js
  └── utils.js
```

---

## 2. Deployment Options

### Option A: GitHub Pages
1. Push your repository to GitHub (`main` branch).
2. Navigate to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then click **Save**.
5. Your site will be published at `https://<username>.github.io/FIRMS-Harmony/`.

### Option B: Netlify
- **Drag & Drop:** Drag the repository root folder into [Netlify Drop](https://app.netlify.com/drop).
- **Git Integration:** Connect your repository with:
  - **Build command:** *(leave empty)*
  - **Publish directory:** `.`

### Option C: Cloudflare Pages
1. Connect your GitHub repository in the Cloudflare Dashboard under **Workers & Pages**.
2. Set **Framework preset** to `None`, leave **Build command** blank, and set **Build output directory** to `/`.

### Option D: Vercel
1. Import the repository in Vercel.
2. Select **Other** as the framework preset, leave build command empty, and deploy the root directory.

### Option E: Self-Hosted Nginx
Example minimal server block:
```nginx
server {
    listen 80;
    server_name fireharmony.example.com;
    root /var/www/firms-harmony;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(css|js|svg|jpg)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 3. Production Considerations

- **HTTPS:** Always serve over HTTPS in production. All external CDN URLs (`cdnjs.cloudflare.com`, `basemaps.cartocdn.com`, `fonts.googleapis.com`) use HTTPS, preventing mixed-content warnings.
- **Content Security Policy (CSP):** If you configure a strict CSP header, allow:
  - `script-src 'self' https://cdnjs.cloudflare.com`
  - `style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com`
  - `font-src https://fonts.gstatic.com`
  - `img-src 'self' data: https://*.basemaps.cartocdn.com`
- **Client-Side Privacy:** Uploaded NASA FIRMS CSV files are read via the browser's `FileReader` API and processed strictly in memory. No user data is transmitted to any backend server.
