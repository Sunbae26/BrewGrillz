import { env } from "../../../config/env.js";
import { testProvider } from "./test.provider.js";
import { stripeProvider } from "./stripe.provider.js";

const providers = { test: testProvider, stripe: stripeProvider };

export const activeProvider = () => providers[env.PAYMENT_PROVIDER];

export const providerFor = (name) => providers[name];
