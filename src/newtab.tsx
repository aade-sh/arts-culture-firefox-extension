import { render, h } from 'preact';
import { NewTabApp } from './NewTabApp';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (root) {
    render(<NewTabApp />, root);
  }
});