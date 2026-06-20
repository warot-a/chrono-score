'use client';

import { useState, useEffect } from 'react';
import { CHANGELOG } from '@/lib/changelog';

const STORAGE_KEY = 'wc_seen_version';

export function WhatsNewDialog() {
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed');

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== CHANGELOG.version) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState('open');
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, CHANGELOG.version);
    setState('closing');
    setTimeout(() => setState('closed'), 260);
  }

  if (state === 'closed') {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes wn-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes wn-out {
          to { opacity: 0; transform: translate(-50%, -50%) scale(.97); }
        }
        .wn-overlay {
          position: fixed;
          inset: 0;
          z-index: 59;
          background: rgba(0,0,0,.45);
          backdrop-filter: blur(2px);
        }
        .wn-card {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 60;
          width: 380px;
          max-width: calc(100vw - 32px);
          background: linear-gradient(165deg, #142d0f, #0f220b);
          border: 1px solid rgba(65,146,40,.24);
          border-radius: 18px;
          padding: 22px 24px 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.04);
          animation: wn-in .42s cubic-bezier(.2,.9,.25,1) both;
        }
        .wn-card.closing {
          animation: wn-out .26s ease forwards;
        }
        .wn-x {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          border: 1px solid rgba(65,146,40,.24);
          background: rgba(255,255,255,.04);
          color: #85c45e;
          font-size: 14px;
          line-height: 1;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: .15s;
        }
        .wn-x:hover { color: #e6f5dc; border-color: #419228; }
        .wn-ver {
          display: inline-flex;
          align-items: center;
          font-family: "Anton", sans-serif;
          font-size: 13px;
          letter-spacing: .06em;
          color: #f3c44d;
          background: color-mix(in srgb, #f3c44d 15%, transparent);
          border: 1px solid color-mix(in srgb, #f3c44d 38%, transparent);
          padding: 3px 10px;
          border-radius: 20px;
        }
        .wn-title {
          font-family: "Anton", sans-serif;
          font-size: 30px;
          text-transform: uppercase;
          letter-spacing: .01em;
          line-height: 1;
          margin: 12px 0 16px;
          color: #e6f5dc;
        }
        .wn-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .wn-list li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 14px;
          line-height: 1.4;
          color: #85c45e;
          font-weight: 600;
        }
        .wn-spark { color: #f3c44d; flex: none; font-size: 14px; line-height: 1.45; }
        .wn-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid rgba(65,146,40,.24);
        }
        .wn-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          font-weight: 700;
          color: #85c45e;
          text-decoration: none;
          transition: .15s;
        }
        .wn-link:hover { color: #f3c44d; }
        .wn-got {
          border: 0;
          background: #f3c44d;
          color: #1a0b30;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: .02em;
          padding: 9px 20px;
          border-radius: 10px;
          cursor: pointer;
          transition: .15s;
          box-shadow: 0 4px 14px color-mix(in srgb, #f3c44d 40%, transparent);
        }
        .wn-got:hover { filter: brightness(1.06); transform: translateY(-1px); }
      `}</style>

      <div className="wn-overlay" onClick={dismiss} />
      <div className={`wn-card${state === 'closing' ? ' closing' : ''}`} role="dialog" aria-label="What's new">
        <button className="wn-x" aria-label="Close" onClick={dismiss}>
          ✕
        </button>

        <span className="wn-ver">v{CHANGELOG.version}</span>
        <h2 className="wn-title">What&rsquo;s new</h2>

        <ul className="wn-list">
            {CHANGELOG.items.map((item) => (
              <li key={item}>
                <span className="wn-spark">✦</span>
                <span>{item}</span>
              </li>
            ))}
        </ul>

        <div className="wn-foot">
          <a
            className="wn-link"
            href="https://github.com/warot-a/chrono-score/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            All releases <span>↗</span>
          </a>
          <button className="wn-got" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
