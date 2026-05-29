// Backend global typescript types and interfaces
export interface BaseResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UserSession {
  userId: string;
  email: string;
  role: string;
}
