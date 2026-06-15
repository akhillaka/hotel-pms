import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../views/Login';
import axios from 'axios';
import toast from 'react-hot-toast';

// Mock axios
vi.mock('axios');

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Login Component UI and Actions', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the login form elements correctly', () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    expect(screen.getByText('USERNAME')).toBeInTheDocument();
    expect(screen.getByText('PASSWORD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('shows error toast and rejects submit when fields are empty', async () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith('Please fill in all fields');
    expect(axios.post).not.toHaveBeenCalled();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('authenticates successfully and triggers success callbacks', async () => {
    const fakeToken = 'mocked-jwt-token-value';
    const fakeUser = { id: 'u_123', name: 'John Doe', username: 'john', role: 'Admin' };
    
    // Setup Axios mock response
    axios.post.mockResolvedValueOnce({
      data: {
        token: fakeToken,
        user: fakeUser
      }
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Fill in credentials
    const usernameInput = screen.getByPlaceholderText('e.g. admin');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    fireEvent.change(usernameInput, { target: { value: 'john' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit
    const form = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(form);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/auth/login', {
        username: 'john',
        password: 'password123'
      });
    });

    // Check localStorage saved token
    expect(localStorage.getItem('pms_token')).toBe(fakeToken);

    // Check callback and toast functions were called
    expect(mockOnLoginSuccess).toHaveBeenCalledWith(fakeUser);
    expect(toast.success).toHaveBeenCalledWith('Welcome back, John Doe 👋');
  });

  it('shows error toast when authentication fails', async () => {
    // Setup Axios mock rejection
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Invalid credentials'
        }
      }
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText('e.g. admin');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpwd' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });
});
