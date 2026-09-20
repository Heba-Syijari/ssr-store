import { redirect } from "next/navigation";

/** The catalogue is the home page — there is nothing else to show at "/". */
export default function HomePage() {
  redirect("/products");
}
