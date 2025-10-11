"use client";

import { TurnkeyProvider as TurnkeyWalletProvider } from "@turnkey/react-wallet-kit";

export function TurnkeyProvider({ children }: { children: React.ReactNode }) {
  const turnkeyConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
    organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
    authProxyConfigId: process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID!,
  };

  return (
    <TurnkeyWalletProvider config={turnkeyConfig}>
      {children}
    </TurnkeyWalletProvider>
  );
}
