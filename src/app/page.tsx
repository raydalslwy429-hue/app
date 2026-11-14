import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "admin" || session.role === "super_admin" || session.role === "general_admin") {
    redirect("/admin");
  } else if (session.role === "inspector") {
    redirect("/inspector");
  } else {
    redirect("/field");
  }

  return null;
}
