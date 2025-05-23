import type { UserLogin } from '../types/user';

// Use the imported types in function signatures
export const loginUser = async (credentials: UserLogin) => {
  try {
    const response = await fetch('/api/v1/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const user = await response.json();
    
    // Update localStorage with current user info
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

export const registerUser = async (name: string, password: string, email: string) => {
  try {
    const response = await fetch('/api/v1/user/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, password, email }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const user = await response.json();
    
    // Update localStorage with current user info
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
};

export const logoutUser = () => {
  // Clear user data from localStorage
  localStorage.removeItem('user');
};