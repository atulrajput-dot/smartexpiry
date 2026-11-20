import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/constants";

/** The proxy already sends "/" to /home or /login; this is only a fallback. */
export default function Index() {
  redirect(ROUTES.home);
}
