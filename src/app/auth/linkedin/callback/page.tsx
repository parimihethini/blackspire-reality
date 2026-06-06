"use client";

import { Suspense } from "react";
import LinkedInCallbackPage from "./LinkedInCallbackInner";

export default function Page() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-[#0A0F1F]" />}>
            <LinkedInCallbackPage />
        </Suspense>
    );
}
