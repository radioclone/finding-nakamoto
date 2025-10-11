import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  unique,
  index,
  boolean,
  bigint,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Trading Organizations
export const tradingOrganizations = pgTable(
  "trading_organizations",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id").notNull().unique(),
    organizationName: text("organization_name").notNull(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table): Record<string, any> => ({
    userIdIdx: index("trading_orgs_user_id_idx").on(table.userId),
  })
);

// Trading Wallets
export const tradingWallets = pgTable(
  "trading_wallets",
  {
    id: serial("id").primaryKey(),
    walletId: text("wallet_id").notNull().unique(),
    walletName: text("wallet_name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => tradingOrganizations.organizationId),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table): Record<string, any> => ({
    orgIdIdx: index("trading_wallets_org_id_idx").on(table.organizationId),
  })
);

// Trading Wallet Accounts
export const tradingWalletAccounts = pgTable(
  "trading_wallet_accounts",
  {
    id: serial("id").primaryKey(),
    walletAccountId: text("wallet_account_id").notNull().unique(),
    walletAccountName: text("wallet_account_name").notNull(),
    walletId: text("wallet_id")
      .notNull()
      .references(() => tradingWallets.walletId),
    publicKey: text("public_key").notNull(),
    stacksAddress: text("stacks_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table): Record<string, any> => ({
    walletIdIdx: index("trading_accounts_wallet_id_idx").on(table.walletId),
    publicKeyIdx: index("trading_accounts_public_key_idx").on(table.publicKey),
    stacksAddressIdx: index("trading_accounts_stacks_address_idx").on(
      table.stacksAddress
    ),
  })
);

