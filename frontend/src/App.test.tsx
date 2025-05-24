import { render, screen } from '@testing-library/react';
import App from './App';

test('renders headline text', () => {
  render(<App />);
  const headline = screen.getByText(/Frontend ↔ Backend Test/i);
  expect(headline).toBeInTheDocument();
});