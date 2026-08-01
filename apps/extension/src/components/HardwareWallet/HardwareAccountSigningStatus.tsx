import { VStack } from "@chakra-ui/react";

import { LedgerSigningStatus } from "@/components/Ledger/LedgerSigningStatus";
import { TrezorSigningStatus } from "@/components/Trezor/TrezorSigningStatus";
import { ViewOnlySigningNotice } from "@/components/shared/ViewOnlySigningNotice";

export function HardwareAccountSigningStatus({
  accountType,
  active,
  showTrezorHashNotice = false,
}: {
  accountType?: string;
  active: boolean;
  showTrezorHashNotice?: boolean;
}) {
  if (accountType === "ledger") {
    return <LedgerSigningStatus active={active} />;
  }
  if (accountType !== "trezor") return null;
  return (
    <VStack align="stretch" spacing={2}>
      {showTrezorHashNotice && (
        <ViewOnlySigningNotice message="Some Trezor models display only EIP-712 hashes. Compare the exact digest in Advanced details before signing." />
      )}
      <TrezorSigningStatus active={active} />
    </VStack>
  );
}
