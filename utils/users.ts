export type User = {
  username: string;
  password: string;
};

export const VALID_USER: User = {
  username: process.env.USERNAME ?? '',
  password: process.env.PASSWORD ?? '',
};
