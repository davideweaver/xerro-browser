import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Deep-link entry point for the installed PWA.
 *
 * The manifest registers the `web+xerro` protocol with url `/open?target=%s`, so
 * `web+xerro://chat/<id>` launches the app at `/open?target=web%2Bxerro%3A%2F%2Fchat%2F<id>`.
 * Combined with `launch_handler.client_mode = navigate-existing`, this navigates the
 * already-open window instead of spawning a new one.
 */
export default function OpenTarget() {
  const [params] = useSearchParams();
  const target = params.get("target") ?? "";
  return <Navigate to={resolveTarget(target)} replace />;
}

function resolveTarget(raw: string): string {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep as-is */
  }
  // Accept web+xerro://path, xerro://path, or a bare /path.
  const m = value.match(/^(?:web\+)?xerro:\/\/(.*)$/i);
  let path = m ? m[1] : value;
  if (/^https?:\/\//i.test(path)) {
    try {
      const u = new URL(path);
      path = u.pathname + u.search + u.hash;
    } catch {
      path = "/";
    }
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // Only ever navigate within the app.
  if (path.startsWith("//")) return "/";
  return path;
}
