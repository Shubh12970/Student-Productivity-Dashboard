import type { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

// Clerk session tokens are verified against the instance's public JWKS.
// No Clerk secret key is needed or stored on this server.
// jose is ESM-only, so it is imported dynamically (this package is CJS).
type Jose = typeof import("jose", { with: { "resolution-mode": "import" } });
let josePromise: Promise<Jose> | null = null;
let jwks: ReturnType<Jose["createRemoteJWKSet"]> | null = null;

function loadJose(): Promise<Jose> {
  if (!josePromise) {
    josePromise = import("jose");
  }
  return josePromise;
}

function getIssuer(): string {
  const issuer = process.env.CLERK_ISSUER;
  if (!issuer) {
    throw new Error("CLERK_ISSUER is missing. Check server environment.");
  }
  return issuer.replace(/\/+$/, "");
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Sign in to sync your tasks." });
    return;
  }
  try {
    const jose = await loadJose();
    if (!jwks) {
      jwks = jose.createRemoteJWKSet(new URL(`${getIssuer()}/.well-known/jwks.json`));
    }
    const { payload } = await jose.jwtVerify(header.slice(7), jwks, {
      issuer: getIssuer(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      res.status(401).json({ message: "Invalid session. Please sign in again." });
      return;
    }
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}
