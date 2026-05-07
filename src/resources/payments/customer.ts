import type { PaymentCustomer } from "../../types";

/**
 * Translate the SDK's camelCase Customer shape into the wire form expected by
 * the Snippe API. The API uses lowercase-concatenated `firstname` / `lastname`
 * (not snake_case), so the generic case-map can't translate them automatically.
 */
export function customerToWire(c: PaymentCustomer): Record<string, unknown> {
  const wire: Record<string, unknown> = {
    firstname: c.firstName,
    lastname: c.lastName,
    email: c.email,
  };
  if (c.address !== undefined) wire.address = c.address;
  if (c.city !== undefined) wire.city = c.city;
  if (c.state !== undefined) wire.state = c.state;
  if (c.postcode !== undefined) wire.postcode = c.postcode;
  if (c.country !== undefined) wire.country = c.country;
  return wire;
}
