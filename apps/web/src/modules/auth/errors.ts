interface AuthErrorLike {
  code?: string;
}

export function getLoginErrorMessage(error: AuthErrorLike) {
  void error;
  return "Email or password is incorrect.";
}

export function getSignupErrorMessage(error: AuthErrorLike) {
  switch (error.code) {
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "signup_disabled":
      return "Account creation is temporarily unavailable.";
    case "weak_password":
      return "Choose a stronger password and try again.";
    default:
      return "We could not create your account. Please try again.";
  }
}
