import type { AppServices } from "./interfaces";
import { supabaseServices } from "./supabase";
// import { mockServices } from "./mock";

/**
 * Single provider entry point.
 * Switch between supabaseServices (live) and mockServices (demo) here.
 */
export const services: AppServices = supabaseServices;

export type { AppServices } from "./interfaces";
