export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigurationError';
  }
}

export class AuthRequiredError extends Error {
  constructor(message = '登录状态已失效，请重新登录。') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}
