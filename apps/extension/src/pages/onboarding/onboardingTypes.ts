export type OnboardingStep =
  | "accountType"
  | "bankrSetup"
  | "privateKey"
  | "seedPhrase"
  | "viewOnly"
  | "ledger"
  | "trezor"
  | "password"
  | "success";

export type AccountTypeChoice =
  | "seedPhrase"
  | "privateKey"
  | "viewOnly"
  | "ledger"
  | "trezor"
  | "bankr";

export type OnboardingErrors = {
  apiKey?: string;
  privateKey?: string;
  walletAddress?: string;
  viewOnlyAddress?: string;
  password?: string;
  confirmPassword?: string;
};
