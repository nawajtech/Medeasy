import "./Footer.css";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">ApnaMedi</span>
          <p className="footer-copy">
            © {year} ApnaMedi. Laravel + React healthcare platform.
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
