import { AUTHOR } from '@/lib/config';
import { GitHubIcon } from '@/components/WorldCup/GitHubIcon';
import { LinkedInIcon } from '@/components/WorldCup/LinkedInIcon';

export const metadata = {
  title: 'About — chrono-score',
};

// TODO: investigate why Tailwind utility classes don't produce correct output here — inline styles used as workaround
export default function AboutPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1rem',
          padding: '2rem 2.5rem',
          textAlign: 'center',
        }}
      >
        <h1 className="font-anton text-4xl uppercase tracking-wide">chrono-score</h1>
        <p className="font-mono text-sm text-gray-400">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
        <hr style={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--muted)' }}>Built by {AUTHOR.name}</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--faint)', textDecoration: 'none' }}>
              <GitHubIcon />
              GitHub
            </a>
            <a href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--faint)', textDecoration: 'none' }}>
              <LinkedInIcon />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
