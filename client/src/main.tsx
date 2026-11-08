import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, HandleSSOCallback, SignIn, SignUp } from "@clerk/react";
import "./index.css";
import App from "./App.tsx";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
if (!publishableKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is missing. Add it to the client environment.");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      {window.location.pathname === "/sso-callback" ? <HandleSSOCallback navigateToApp={() => window.location.replace("/")} navigateToSignIn={() => window.location.replace("/auth/sign-in")} navigateToSignUp={() => window.location.replace("/auth/sign-up")}/> : window.location.pathname === "/auth/sign-in" ? <SignIn routing="hash" forceRedirectUrl="/"/> : window.location.pathname === "/auth/sign-up" ? <SignUp routing="hash" forceRedirectUrl="/"/> : <App /> }
    </ClerkProvider>
  </StrictMode>
);
