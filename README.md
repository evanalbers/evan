# Personal site

A static landing page with a cellular automaton running in the background.
No build step: GitHub Pages serves these files as they are.

## Files

- `index.html`: the page and its copy. Replace anything in `[SQUARE BRACKETS]`.
- `style.css`: layout and both colour themes (light and dark blocks at the top).
- `automaton.js`: the background automaton and the theme toggle. Cell size, speed
  and the list of rules are at the top of the file.
- `.nojekyll`: tells GitHub Pages to serve the files without processing them.

## Deploy on GitHub Pages

1. Create a public repository named `<your-username>.github.io`.
   (Any other name also works; the site then lives at `<your-username>.github.io/<repo-name>`.)
2. Add these files to the repository root, keeping `index.html` at the top level:

   ```sh
   git init
   git add .
   git commit -m "Landing page"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-username>.github.io.git
   git push -u origin main
   ```

   Or drag the files into the repository on github.com with "Add file > Upload files".
3. In the repository, open Settings > Pages. Under "Build and deployment", set the
   source to "Deploy from a branch", choose `main` and `/ (root)`, and save.
4. After a minute or so the site is live at `https://<your-username>.github.io`.

To use your own domain, enter it under Settings > Pages > Custom domain and add the
DNS records GitHub shows you at your registrar.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Themes

The page follows the device's light or dark setting. The "Dark mode" / "Light mode"
button overrides it and the choice is remembered in the browser.

## Using the automaton on other pages

Give each page the same wrapper and include the script:

```html
<div class="page">
  <canvas id="automaton" aria-hidden="true"></canvas>
  <div class="wrap"> ...your content, on .panel elements... </div>
</div>
<script src="automaton.js"></script>
```

The rule readout and pause button are optional; the script skips them if absent.
