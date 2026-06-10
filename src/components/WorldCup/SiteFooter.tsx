import { GitHubIcon } from './GitHubIcon';
import { LinkedInIcon } from './LinkedInIcon';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>Built by Warot Anusakprasit</span>
        <a href="https://github.com/warot-a" target="_blank" rel="noopener noreferrer">
          <GitHubIcon />GitHub
        </a>
        <a href="https://www.linkedin.com/in/warota/" target="_blank" rel="noopener noreferrer">
          <LinkedInIcon />LinkedIn
        </a>
      </div>
    </footer>
  );
}
