import { h } from 'preact';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading artwork..." }: LoadingSpinnerProps) {
  return (
    <div id="loading" className="loading">
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  );
}