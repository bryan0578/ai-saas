import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";

import { absoluteUrl } from "@/lib/utils";

const settingsUrl = absoluteUrl("/settings");

export async function GET() {
    try {
        const { userId } = auth();
        const user = await currentUser();

        // Check to see if user exists
        if (!userId || !user) {
        return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check to see if user has a subscription
        const userSubscription = await prismadb.userSubscription.findUnique({
        where: {
            userId
        }
        })

        // If user already has a subscription redirect user to the settings page to manage billing
        if (userSubscription && userSubscription.stripeCustomerId) {
        const stripeSession = await stripe.billingPortal.sessions.create({
            customer: userSubscription.stripeCustomerId,
            return_url: settingsUrl,
        })

        // return session url
        return new NextResponse(JSON.stringify({ url: stripeSession.url }))
        }

        // Create checkout session for users without a subscription.
        const stripeSession = await stripe.checkout.sessions.create({
        success_url: settingsUrl,
        cancel_url: settingsUrl,
        payment_method_types: ["card"],
        mode: "subscription",
        billing_address_collection: "auto",
        customer_email: user.emailAddresses[0].emailAddress,
        line_items: [
            {
            price_data: {
                currency: "USD",
                product_data: {
                name: "Genius Pro",
                description: "Unlimited AI Generations"
                },
                unit_amount: 2000,
                recurring: {
                interval: "month"
                }
            },
            quantity: 1,
            },
        ],
        metadata: {
            userId,
        },
        })

        // return checkout session url
        return new NextResponse(JSON.stringify({ url: stripeSession.url }))
    } catch (error) {
        // return any errors
        console.log("[STRIPE_ERROR]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}