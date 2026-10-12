/**
 * /signup is kept for old links; account setup now lives on the login page.
 */

import { redirect } from "next/navigation";

export default function SignupRedirect() {
  redirect("/login?setup=1");
}
