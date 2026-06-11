import { AUTHOR } from '@/lib/config';
import { GitHubIcon } from './GitHubIcon';
import { LinkedInIcon } from './LinkedInIcon';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>Built by {AUTHOR.name}</span>
        <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer">
          <GitHubIcon />
          GitHub
        </a>
        <a href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer">
          <LinkedInIcon />
          LinkedIn
        </a>
      </div>
    </footer>
  );
}
