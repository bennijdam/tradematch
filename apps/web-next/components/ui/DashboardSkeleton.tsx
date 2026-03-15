/**
 * Dashboard Skeleton Loader
 * Matches the TradeMatch aesthetic with neon accents
 */

'use client';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#080C12', padding: '32px' }}>
      {/* Header Skeleton */}
      <div className="mb-7">
        <div 
          className="h-3 w-24 rounded mb-2"
          style={{ background: 'rgba(0,229,160,0.2)' }}
        />
        <div 
          className="h-8 w-64 rounded"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        />
      </div>
      
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-4 gap-5 mb-7">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6"
            style={{ 
              background: '#111827', 
              border: '1px solid rgba(255,255,255,0.07)' 
            }}
          >
            <div className="flex justify-between mb-4">
              <div 
                className="w-11 h-11 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
              <div 
                className="h-6 w-14 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            </div>
            <div 
              className="h-4 w-20 rounded mb-2"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            />
            <div 
              className="h-8 w-16 rounded"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />
          </div>
        ))}
      </div>
      
      {/* Main Content Skeleton */}
      <div 
        className="rounded-2xl p-6"
        style={{ 
          background: '#111827', 
          border: '1px solid rgba(255,255,255,0.07)' 
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-20 h-20 rounded-full"
            style={{ background: 'rgba(0,229,160,0.1)' }}
          />
          <div>
            <div 
              className="h-6 w-48 rounded mb-2"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />
            <div 
              className="h-4 w-32 rounded"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
          </div>
        </div>
        
        {/* Progress bar skeleton */}
        <div 
          className="h-2.5 rounded-full mb-4"
          style={{ background: '#141B28' }}
        >
          <div 
            className="h-full rounded-full w-3/4"
            style={{ 
              background: 'linear-gradient(90deg, #007a3d, #00E5A0)',
              opacity: 0.5 
            }}
          />
        </div>
        
        {/* Milestones skeleton */}
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              />
              <div 
                className="h-3 w-10 rounded"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Loading pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        div {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
