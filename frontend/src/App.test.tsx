import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login landing page', () => {
  render(<App />);
  const headline = screen.getByRole('heading', { name: /when worlds collide/i });
  expect(headline).toBeInTheDocument();
});
