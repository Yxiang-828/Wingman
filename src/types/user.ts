export interface UserLogin {
  username: string;
  password: string;
}

export interface UserRegister {
  name: string;
  email: string;
  username?: string;
  password: string;
}