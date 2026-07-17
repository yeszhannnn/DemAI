/**
 * Tappable — DESIGN §7. Historically mounted once (in the root layout) to
 * delegate the one-shot selection pulse via the Web Animations API. The lime
 * pulse has been removed app-wide (only hover lift + press scale remain, both
 * handled purely in CSS by the `.tappable` / `.tap` utilities in globals.css).
 *
 * The component is retained as a no-op so the root layout import is unchanged;
 * it renders nothing and attaches no listeners.
 */
export function Tappable() {
  return null;
}
