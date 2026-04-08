import { render, screen } from '@testing-library/react';
import App from '../App';
import '@testing-library/jest-dom';

describe('App', () => {
  it('renderiza o texto Boas Vindas', () => {
    render(<App />);
    expect(screen.getByText(/Boas Vindas/i)).toBeInTheDocument();
  });
});
