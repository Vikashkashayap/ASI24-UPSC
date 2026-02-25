/**
 * Pricing plans service – uses backend API.
 * Public: getActive() for landing page.
 * Admin: list(), create(), update(), delete() for /admin/pricing.
 */
import { pricingAPI, type PricingPlanType } from "./api";

export type { PricingPlanType };

export const pricingService = {
  getActive: pricingAPI.getActive,
  list: pricingAPI.list,
  create: pricingAPI.create,
  update: pricingAPI.update,
  delete: pricingAPI.delete,
};
