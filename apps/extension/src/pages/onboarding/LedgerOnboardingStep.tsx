import type { LedgerAccountSelection } from "@/components/Ledger/AddLedgerFlow";
import { ledgerHardwareWalletProvider } from "@/components/Ledger/ledgerFlowAdapter";
import { HardwareWalletOnboardingStep } from "./HardwareWalletOnboardingStep";

export function LedgerOnboardingStep({
  onBack,
  onProgressStepClick,
  onCollect,
}: {
  onBack: () => void;
  onProgressStepClick: (step: number) => void;
  onCollect: (selection: LedgerAccountSelection) => Promise<void>;
}) {
  return (
    <HardwareWalletOnboardingStep
      provider={ledgerHardwareWalletProvider}
      description="Unlock your device and open the Ethereum app, then choose the first accounts to add."
      onBack={onBack}
      onProgressStepClick={onProgressStepClick}
      onCollect={onCollect}
    />
  );
}
