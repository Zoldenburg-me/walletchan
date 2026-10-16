import { Box, Text, VStack } from "@chakra-ui/react";
import AddHardwareWalletFlow from "@/components/HardwareWallet/AddHardwareWalletFlow";
import type {
  HardwareWalletAccountSelection,
  HardwareWalletFlowProvider,
} from "@/components/HardwareWallet/types";
import {
  OnboardingCanvas,
  OnboardingFooter,
  OnboardingHeader,
} from "./OnboardingShell";

export function HardwareWalletOnboardingStep<Scheme extends string>({
  provider,
  description,
  onBack,
  onProgressStepClick,
  onCollect,
}: {
  provider: HardwareWalletFlowProvider<Scheme>;
  description: string;
  onBack: () => void;
  onProgressStepClick: (step: number) => void;
  onCollect: (selection: HardwareWalletAccountSelection) => Promise<void>;
}) {
  return (
    <AddHardwareWalletFlow
      provider={provider}
      onBack={onBack}
      onComplete={() => undefined}
      commitAccounts={onCollect}
      renderLayout={({ content, primaryAction }) => (
        <OnboardingCanvas
          currentStep={1}
          onStepClick={onProgressStepClick}
          header={<OnboardingHeader onBack={onBack} step={1} />}
          footer={
            <OnboardingFooter>
              <Box sx={{ "& > button": { width: "100%" } }}>
                {primaryAction}
              </Box>
            </OnboardingFooter>
          }
        >
          <VStack align="stretch" spacing={6}>
            <VStack align="stretch" spacing={1.5}>
              <Text
                as="h1"
                fontSize="2xl"
                fontWeight="700"
                letterSpacing="-0.02em"
              >
                Connect your {provider.name}
              </Text>
              <Text color="fg.secondary" fontSize="sm" lineHeight="1.5">
                {description}
              </Text>
            </VStack>
            {content}
          </VStack>
        </OnboardingCanvas>
      )}
    />
  );
}
