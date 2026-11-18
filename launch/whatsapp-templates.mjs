// Prints every WhatsApp template exactly as it must be created in Meta (WhatsApp Manager → Message templates).
// Category: Utility. Language: English. Copy each name and body as shown.
//   node launch/whatsapp-templates.mjs
import { TEMPLATES } from "../backend/src/modules/whatsapp/templates.js";

console.log(`Create these ${Object.keys(TEMPLATES).length} templates in Meta (category Utility, language English):\n`);
for (const [name, { params, body }] of Object.entries(TEMPLATES)) {
  console.log(`Name: ${name}`);
  console.log(`Body: ${body}`);
  console.log(`Sample values: ${Array.from({ length: params }, (_, i) => `{{${i + 1}}}`).join(", ")} (Meta asks for an example of each)`);
  console.log("");
}
console.log("When they are approved, set WHATSAPP_PROVIDER=meta, WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Render.");
