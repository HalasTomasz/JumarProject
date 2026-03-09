import { useContext } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthContext, AuthProvider } from './AuthContext';
import apiClient, { clearStoredAuthToken, setUnauthorizedHandler } from '../api/client';

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  clearStoredAuthToken: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

function AuthSnapshot() {
  const { isAuthenticated, loading, user } = useContext(AuthContext);
  return (
    <>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="username">{user?.username || 'none'}</div>
    </>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    clearStoredAuthToken.mockImplementation(() => localStorage.removeItem('auth_token'));
  });

  test('clears in-memory auth state when the unauthorized handler fires', async () => {
    localStorage.setItem('auth_token', 'token-123');
    apiClient.get.mockResolvedValueOnce({
      data: {
        username: 'apiadmin',
        permissions: {},
      },
    });

    render(
      <AuthProvider>
        <AuthSnapshot />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

    const unauthorizedHandler = setUnauthorizedHandler.mock.calls[0][0];

    await act(async () => {
      unauthorizedHandler();
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(clearStoredAuthToken).toHaveBeenCalled();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
