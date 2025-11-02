// app/ui/poker/poker-loading.tsx

'use client';

import { memo } from 'react';

function PokerLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl p-8">
        {/* Main loading container */}
        <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-8">

          {/* Header with spinner */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Poker Table...</h2>
          </div>

          {/* Poker table skeleton */}
          <div className="space-y-6">
            {/* Player slots skeleton */}
            <div className="flex justify-evenly gap-2">
              {[1, 2, 3, 4, 5].map((slot) => (
                <div
                  key={slot}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg bg-gray-50 w-24"
                >
                  {/* Avatar skeleton */}
                  <div className="w-16 h-16 rounded-full bg-gray-300 animate-pulse" />
                  {/* Name skeleton */}
                  <div className="w-16 h-3 bg-gray-300 rounded animate-pulse" />
                  {/* Chips skeleton */}
                  <div className="w-12 h-3 bg-gray-300 rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Communal cards skeleton */}
            <div className="flex justify-center gap-2 py-6">
              {[1, 2, 3, 4, 5].map((card) => (
                <div
                  key={card}
                  className="w-12 h-16 border-2 border-gray-300 rounded bg-gray-200 animate-pulse"
                />
              ))}
            </div>

            {/* Pot skeleton */}
            <div className="flex justify-center">
              <div className="px-6 py-3 border-2 border-gray-300 rounded-lg bg-gray-100">
                <div className="w-32 h-4 bg-gray-300 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Loading message */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">Fetching game data and preparing the table...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PokerLoading);
