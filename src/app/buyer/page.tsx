import { redirect } from "next/navigation";

/** Customer / buyer home after login — profile & saved activity. */
export default function BuyerPortalPage() {
    redirect("/profile");
}
