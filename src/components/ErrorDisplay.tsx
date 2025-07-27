import { h } from 'preact';

interface ErrorDisplayProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="loading">
      <p style={{ color: '#ff6b6b' }}>{message}</p>
    </div>
  );
}