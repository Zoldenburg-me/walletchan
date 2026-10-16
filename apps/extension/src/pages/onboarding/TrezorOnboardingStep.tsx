import type { TrezorAccountSelection } from "@/components/Trezor/AddTrezorFlow";
import { trezorHardwareWalletProvider } from "@/components/Trezor/trezorFlowAdapter";
import { HardwareWalletOnboardingStep } from "./HardwareWalletOnboardingStep";

export function TrezorOnboardingStep({
  onBack,
  onProgressStepClick,
  onCollect,
}: {
  onBack: () => void;
  onProgressStepClick: (step: number) => void;
  onCollect: (selection: TrezorAccountSelection) => Promise<void>;
}) {
  return (
    <HardwareWalletOnboardingStep
      provider={trezorHardwareWalletProvider}
      description="Connect and unlock your Trezor, then choose the first accounts to add. Trezor may open its own approval window."
      onBack={onBack}
      onProgressStepClick={onProgressStepClick}
      onCollect={onCollect}
    />
  );
}
