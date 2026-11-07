import "./server";
// httpServerHandler lives in cloudflare:node on current workerd.
// @ts-expect-error no type declarations for cloudflare:node in this CJS tsconfig
import { httpServerHandler } from "cloudflare:node";

export default httpServerHandler({ port: Number(process.env.PORT) || 3000 });
