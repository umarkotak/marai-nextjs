import React, { useState, useEffect } from 'react';

const FakeProgress = ({
  duration = 3000,
  onComplete = () => {},
  className = "",
  showPercentage = true
}) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsComplete(true);
          onComplete();
          clearInterval(interval);
          return 100;
        }

        // Simulate realistic progress with some randomness
        const increment = Math.random() * 3 + 0.5;
        const newProgress = Math.min(prev + increment, 100);

        // Slow down near the end for realism
        if (newProgress > 90) {
          return Math.min(prev + 0.5, 100);
        }

        return newProgress;
      });
    }, duration / 200);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  const reset = () => {
    setProgress(0);
    setIsComplete(false);
  };

  return (
    <div className={`w-full space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">
          {isComplete ? 'Complete!' : 'Loading...'}
        </span>
        {showPercentage && (
          <span className="text-sm text-slate-500">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-slate-900 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* <button
        onClick={reset}
        className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        Reset
      </button> */}
    </div>
  );
};

export default FakeProgress;
