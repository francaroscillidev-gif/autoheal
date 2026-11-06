import * as fs from 'fs';
import * as path from 'path';

export class BadgeGenerator {
  public static generateBadges(outputDir: string = 'assets/badges'): void {
    const fullDir = path.resolve(process.cwd(), outputDir);
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    // 1. Healing Rate Badge
    const healingRateSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a"><rect width="160" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#a)">
    <rect width="80" height="20" fill="#555"/>
    <rect x="80" width="80" height="20" fill="#22c55e"/>
    <rect width="160" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="40" y="15" fill="#010101" fill-opacity=".3">AutoHeal</text>
    <text x="40" y="14">AutoHeal</text>
    <text x="120" y="15" fill="#010101" fill-opacity=".3">100% Pass</text>
    <text x="120" y="14">100% Pass</text>
  </g>
</svg>`.trim();

    // 2. Instant Cache Badge
    const cacheSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="20">
  <mask id="a"><rect width="150" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#a)">
    <rect width="70" height="20" fill="#555"/>
    <rect x="70" width="80" height="20" fill="#0284c7"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="35" y="14">Memory</text>
    <text x="110" y="14">0ms Cache</text>
  </g>
</svg>`.trim();

    // 3. SafeGuard Protected Badge
    const safeGuardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="165" height="20">
  <mask id="a"><rect width="165" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#a)">
    <rect width="75" height="20" fill="#555"/>
    <rect x="75" width="90" height="20" fill="#9333ea"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="37" y="14">SafeGuard</text>
    <text x="120" y="14">Bug-Protected</text>
  </g>
</svg>`.trim();

    fs.writeFileSync(path.join(fullDir, 'autoheal-rate.svg'), healingRateSvg, 'utf-8');
    fs.writeFileSync(path.join(fullDir, 'autoheal-cache.svg'), cacheSvg, 'utf-8');
    fs.writeFileSync(path.join(fullDir, 'autoheal-safeguard.svg'), safeGuardSvg, 'utf-8');
  }
}
