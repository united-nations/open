// GitHub Pages cannot issue the server-side redirect used by the mandates
// site. Render the de-facto home page at `/` so there is no client redirect or
// intermediate paint. Keep `/system/` as a stable direct URL.
export { default, metadata } from "./system/page";
