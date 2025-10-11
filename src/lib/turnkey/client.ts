import { Turnkey as TurnkeyServerSDK } from "@turnkey/sdk-server";

export const getTurnkeyClient = () => {
  if (!process.env.TURNKEY_BASE_URL) {
    throw new Error("TURNKEY_BASE_URL is not configured");
  }

  if (!process.env.TURNKEY_API_PRIVATE_KEY) {
    throw new Error("TURNKEY_API_PRIVATE_KEY is not configured");
  }

  if (!process.env.TURNKEY_API_PUBLIC_KEY) {
    throw new Error("TURNKEY_API_PUBLIC_KEY is not configured");
  }

  if (!process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID) {
    throw new Error("NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID is not configured");
  }

  return new TurnkeyServerSDK({
    apiBaseUrl: process.env.TURNKEY_BASE_URL,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID,
  });
};
