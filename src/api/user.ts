import { API_BASE_URL } from '../config/api';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
}

export const loginUser = async (username: string, password: string) => {
  try {
    console.log(`Attempting login with API URL: ${API_BASE_URL}/user/login`);
    
    const response = await fetch(`${API_BASE_URL}/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Login failed with status: ${response.status}`, errorText);
      throw new Error('Login failed: ' + (errorText || 'Unknown error'));
    }

    const user = await response.json();
    console.log('Login successful, user data received');
    
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
    console.log(`Attempting registration with API URL: ${API_BASE_URL}/user/register`);
    
    const response = await fetch(`${API_BASE_URL}/user/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, password, email }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Registration failed with status: ${response.status}`, errorText);
      throw new Error('Registration failed: ' + (errorText || 'Unknown error'));
    }

    const user = await response.json();
    console.log('Registration successful, user data received');
    
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
  console.log('User logged out, local storage cleared');
};