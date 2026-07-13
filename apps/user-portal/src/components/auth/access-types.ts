export type AccessMode = 'sign-in' | 'register';

export type AccessForm = {
  name: string;
  email: string;
  password: string;
};

export const INITIAL_ACCESS_FORM: AccessForm = { name: '', email: '', password: '' };
