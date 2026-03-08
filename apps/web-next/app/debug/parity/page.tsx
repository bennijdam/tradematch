'use client';

/**
 * Visual QA & Parity Testing Tool
 * 
 * This page renders the original legacy HTML dashboards alongside
 * the new Next.js React implementations for pixel-perfect comparison.
 * 
 * Scoring System:
 * - Score < 0.02: PASS (perfect match)
 * - Score 0.02-0.05: ACCEPTABLE (minor deviations)
 * - Score > 0.05: FAIL (needs refinement)
 * 
 * @see VISUAL-PARITY-CHECKLIST.md for detailed audit criteria
 */

import { useState, useRef, useCallback } from 'react';

// Dashboard variants to test
const DASHBOARD_VARIANTS = [
  { 
    id: 'super-admin', 
    name: 'Super Admin Dashboard',
    legacyPath: '/super-admin-dashboard.html',
    description: 'God View, Dispute Centre, Verification Queue'
  },
  { 
    id: 'user', 
    name: 'User Dashboard',
    legacyPath: '/user-dashboard.html',
    description: 'My Projects, Escrow, Milestones'
  },
  { 
    id: 'vendor', 
    name: 'Vendor Dashboard',
    legacyPath: '/vendor-dashboard.html',
    description: 'Active Jobs, Analytics, Coverage Map'
  },
] as const;

// Opacity levels for comparison
const OPACITY_LEVELS = [
  { label: '50% / 50%', value: 0.5 },
  { label: '25% Legacy / 75% New', value: 0.25 },
  { label: '75% Legacy / 25% New', value: 0.75 },
  { label: '100% / 0%', value: 1 },
  { label: '0% / 100%', value: 0 },
];

export default function ParityTestingPage() {
  const [selectedVariant, setSelectedVariant] = useState(DASHBOARD_VARIANTS[0]);
  const [opacity, setOpacity] = useState(0.5);
  const [isSplitView, setIsSplitView] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showDiffHighlight, setShowDiffHighlight] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  
  const legacyIframeRef = useRef<HTMLIFrameElement>(null);
  const newRef = useRef<HTMLDivElement>(null);

  const calculateParityScore = useCallback(() => {
    // Placeholder for automated visual diff scoring
    // In production, this would use pixelmatch or similar
    const mockScore = Math.random() * 0.1;
    setScore(mockScore);
  }, []);

  return (
    <div className="min-h-screen bg-[#050709] text-white overflow-hidden">
      {/* Header */}
      <header className="h-[54px] bg-[#0a0d14] border-b border-white/[0.055] flex items-center justify-between px-6 z-50 relative">
        <div className="flex items-center gap-4">
          <div className="w-7 h-7 rounded-[7px] bg-[#00E5A0] flex items-center justify-center font-syne text-[12px] font-extrabold text-black">
            P
          </div>
          <div>
            <h1 className="font-syne text-[14px] font-bold">Visual Parity Testing</h1>
            <p className="font-mono text-[7.5px] text-white/20 tracking-[0.14em] uppercase mt-0.5">
              Pixel-Perfect QA Engine
            </p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Dashboard Selector */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[7.5px] text-white/38 tracking-[0.13em] uppercase">
              Testing
            </span>
            <select 
              value={selectedVariant.id}
              onChange={(e) => {
                const variant = DASHBOARD_VARIANTS.find(v => v.id === e.target.value);
                if (variant) setSelectedVariant(variant);
              }}
              className="bg-[#141720] border border-white/[0.09] rounded-[6px] px-3 py-1.5 text-[11px] focus:border-[#00E5A0] outline-none"
            >
              {DASHBOARD_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 border-l border-white/[0.055] pl-4">
            <button
              onClick={() => setIsSplitView(true)}
              className={`px-3 py-1.5 rounded-[6px] text-[10px] font-medium transition-all ${
                isSplitView 
                  ? 'bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/25' 
                  : 'bg-[#191d28] text-white/38 border border-white/[0.09]'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setIsSplitView(false)}
              className={`px-3 py-1.5 rounded-[6px] text-[10px] font-medium transition-all ${
                !isSplitView 
                  ? 'bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/25' 
                  : 'bg-[#191d28] text-white/38 border border-white/[0.09]'
              }`}
            >
              Overlay
            </button>
          </div>

          {/* Opacity Control */}
          <div className="flex items-center gap-2 border-l border-white/[0.055] pl-4">
            {OPACITY_LEVELS.map((level) => (
              <button
                key={level.label}
                onClick={() => setOpacity(level.value)}
                className={`px-2 py-1 rounded text-[8.5px] font-medium transition-all ${
                  opacity === level.value
                    ? 'bg-[#00E5A0]/15 text-[#00E5A0]'
                    : 'text-white/38 hover:text-white/68'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>

          {/* Analysis Tools */}
          <div className="flex items-center gap-2 border-l border-white/[0.055] pl-4">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-1.5 rounded-[6px] text-[10px] font-medium transition-all ${
                showGrid 
                  ? 'bg-[#42A5F5]/10 text-[#42A5F5] border border-[#42A5F5]/25' 
                  : 'bg-[#191d28] text-white/38 border border-white/[0.09]'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setShowDiffHighlight(!showDiffHighlight)}
              className={`px-3 py-1.5 rounded-[6px] text-[10px] font-medium transition-all ${
                showDiffHighlight 
                  ? 'bg-[#FFA726]/10 text-[#FFA726] border border-[#FFA726]/25' 
                  : 'bg-[#191d28] text-white/38 border border-white/[0.09]'
              }`}
            >
              Diff
            </button>
          </div>

          {/* Score Button */}
          <button
            onClick={calculateParityScore}
            className="ml-2 px-4 py-1.5 bg-[#00E5A0] text-black rounded-[6px] text-[11px] font-semibold hover:opacity-85 transition-opacity"
          >
            Calculate Score
          </button>
        </div>

        {/* Score Display */}
        {score !== null && (
          <div className={`px-3 py-1.5 rounded-[6px] text-[10px] font-bold ${
            score < 0.02 
              ? 'bg-[#00E5A0]/15 text-[#00E5A0] border border-[#00E5A0]/25'
              : score < 0.05
              ? 'bg-[#FFA726]/15 text-[#FFA726] border border-[#FFA726]/25'
              : 'bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/25'
          }`}>
            Score: {score.toFixed(3)}
          </div>
        )}
      </header>

      {/* Subheader with variant info */}
      <div className="h-[32px] bg-[#0a0d14] border-b border-white/[0.055] flex items-center px-6">
        <span className="font-mono text-[7.5px] text-white/38 tracking-[0.13em] uppercase mr-2">
          Target:
        </span>
        <span className="text-[11px] text-white/68">{selectedVariant.name}</span>
        <span className="mx-2 text-white/20">|</span>
        <span className="text-[10px] text-white/38">{selectedVariant.description}</span>
        <span className="ml-auto font-mono text-[7.5px] text-white/38">
          Legacy Path: {selectedVariant.legacyPath}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="relative h-[calc(100vh-86px)] overflow-hidden">
        {/* Alignment Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-50">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,229,160,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,229,160,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />
          </div>
        )}

        {isSplitView ? (
          // Split View Mode
          <div className="flex h-full">
            {/* Left: Legacy */}
            <div className="flex-1 border-r border-white/[0.055] relative">
              <div className="absolute top-3 left-3 z-10">
                <span className="font-mono text-[7.5px] text-white/38 tracking-[0.13em] uppercase bg-[#0a0d14]/80 px-2 py-1 rounded">
                  Legacy HTML
                </span>
              </div>
              <iframe
                ref={legacyIframeRef}
                src={selectedVariant.legacyPath}
                className="w-full h-full border-0"
                title="Legacy Dashboard"
              />
            </div>

            {/* Right: New Implementation */}
            <div className="flex-1 relative" ref={newRef}>
              <div className="absolute top-3 left-3 z-10">
                <span className="font-mono text-[7.5px] text-[#00E5A0] tracking-[0.13em] uppercase bg-[#0a0d14]/80 px-2 py-1 rounded">
                  Next.js React
                </span>
              </div>
              {/* Placeholder for actual component */}
              <div className="w-full h-full flex items-center justify-center bg-[#080C12]">
                <div className="text-center">
                  <p className="text-white/38 text-[13px]">
                    New {selectedVariant.name} Component
                  </p>
                  <p className="text-white/20 text-[10px] mt-2 font-mono">
                    Import and render here
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Overlay Mode
          <div className="relative h-full">
            {/* Legacy (Bottom Layer) */}
            <iframe
              ref={legacyIframeRef}
              src={selectedVariant.legacyPath}
              className="absolute inset-0 w-full h-full border-0"
              title="Legacy Dashboard"
              style={{ opacity: 1 - opacity }}
            />
            
            {/* New (Top Layer with Opacity) */}
            <div 
              ref={newRef}
              className="absolute inset-0 bg-[#080C12]"
              style={{ opacity }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white/38 text-[13px]">
                    New {selectedVariant.name} Component
                  </p>
                </div>
              </div>
            </div>

            {/* Opacity Indicator */}
            <div className="absolute bottom-4 left-4 z-10">
              <div className="bg-[#0a0d14] border border-white/[0.09] rounded-[6px] px-3 py-2">
                <span className="font-mono text-[7.5px] text-white/38 tracking-[0.13em] uppercase">
                  Overlay: {Math.round((1 - opacity) * 100)}% Legacy / {Math.round(opacity * 100)}% New
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Diff Highlighting Layer */}
        {showDiffHighlight && (
          <div className="absolute inset-0 pointer-events-none z-40">
            <div className="w-full h-full border-2 border-[#FFA726]/50" />
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <footer className="absolute bottom-0 left-0 right-0 bg-[#0a0d14] border-t border-white/[0.055] px-6 py-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Parity Score Legend */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[7.5px] text-white/38 tracking-[0.13em] uppercase">
                Score Guide:
              </span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00E5A0]" />
                <span className="text-[9px] text-white/68">&lt;0.02 PASS</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FFA726]" />
                <span className="text-[9px] text-white/68">0.02-0.05 WARN</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#FF4757]" />
                <span className="text-[9px] text-white/68">&gt;0.05 FAIL</span>
              </div>
            </div>
          </div>

          {/* Key Checks */}
          <div className="flex items-center gap-4">
            <span className="font-mono text-[7.5px] text-white/38 tracking-[0.13em] uppercase">
              Critical Checks:
            </span>
            {['Glow: 0 0 28px rgba(0,229,160,0.35)', 'Font: Syne/Sora weight', 'Spacing: exact px'].map((check) => (
              <span key={check} className="text-[9px] text-white/38 font-mono">
                {check}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
