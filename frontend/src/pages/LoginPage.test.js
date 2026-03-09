import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import useAuth from '../hooks/useAuth';

const mockNavigate = jest.fn();
const mockLocation = jest.fn();

jest.mock('../hooks/useAuth', () => jest.fn());
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation(),
}), { virtual: true });

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.mockReturnValue({ state: null });
    useAuth.mockReturnValue({ login: jest.fn().mockResolvedValue({}) });
  });

  test('redirects to the preserved destination after login', async () => {
    const login = jest.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ login });
    mockLocation.mockReturnValue({
      state: {
        from: {
          pathname: '/orders/doing',
          search: '?page=2',
          hash: '#summary',
        },
      },
    });

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/nazwa użytkownika/i), 'operator');
    await userEvent.type(screen.getByLabelText(/hasło/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /zaloguj się/i }));

    expect(login).toHaveBeenCalledWith({ username: 'operator', password: 'secret123' });
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/orders/doing?page=2#summary', { replace: true })
    );
  });

  test('falls back to the app selector when no destination is preserved', async () => {
    const login = jest.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ login });

    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/nazwa użytkownika/i), 'operator');
    await userEvent.type(screen.getByLabelText(/hasło/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /zaloguj się/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/apps', { replace: true }));
  });
});
