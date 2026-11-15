/**
 * Check the Messaging token: GET /phone-numbers → print each line id + capabilities.
 * Never prints the phone number or the token. In mock mode no request is made.
 *
 *   npm run chert:ping   (from api/)
 */
import { chertJson } from "../src/chert/http.js";
import type { PhoneLine } from "../src/chert/types.js";
import { env } from "../src/env.js";

if (env.CHERT_MODE !== "live") {
  console.log("mock mode, skipping");
  process.exit(0);
}

const { phone_numbers } = await chertJson<{ phone_numbers: PhoneLine[] }>("GET", "/phone-numbers");
if (phone_numbers.length === 0) console.log("no phone lines on this token");
for (const line of phone_numbers) {
  const caps = line.capabilities.length ? line.capabilities.join(", ") : "(none)";
  console.log(`line ${line.phone_line_id ?? line.id}${line.is_active ? "" : " (inactive)"}: ${caps}`);
}
