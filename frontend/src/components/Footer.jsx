import { useAuth } from "../auth/AuthContext";
import { getBranding } from "../utils/branding";
import "./Footer.css";

function Footer() {
  const year = new Date().getFullYear();
  const { user } = useAuth();
  const branding = getBranding(user);
  const name = branding.name || "ApnaMedi";
  const tagline = branding.tagline || "Healthcare Operations, Simplified";

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">{name}</span>
          <p className="footer-copy">
            © {year} {name}. {tagline}.
          </p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <a href="/">Documentation</a>
          <a href="/">Support</a>
          <a href="/">Privacy</a>
          <a href="/">Terms</a>
        </nav>

        <div className="footer-status">
          <span className="status-dot" aria-hidden="true" />
          <span>All systems operational</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
