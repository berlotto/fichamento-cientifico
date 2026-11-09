import { redirect } from "next/navigation";

/** As configurações viraram uma modal; links antigos para /profile abrem ela. */
export default function ProfilePage() {
  redirect("/projects?config=geral");
}
