import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Toaster } from "react-hot-toast";
import { defineChain } from "viem";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const queryClient = new QueryClient();
const crossfi = defineChain({
  id: 4157,
  name: "CrossFi Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "XFI",
    symbol: "XFI",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.ms"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://scan.testnet.ms" },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: "Lendingandborrowing1",
  projectId: "4afbdbac89ad8c8825e88ab2bf11ebdd",
  chains: [crossfi],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

createRoot(document.getElementById("root")).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider showRecentTransactions={true}>
        <StrictMode>
          <App />

          <Toaster position="bottom-right" reverseOrder={true} />
        </StrictMode>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
