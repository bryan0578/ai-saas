import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { OpenAI } from "openai";

import { increaseApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

const openai = new OpenAI({
    // organization: "org-biwV6aj4nyHuDblGbIiqEJhm",
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
    req: Request
) {
    try {
        // Get User Id from clerk
        const { userId } = auth();
        // Get body from request
        const body = await req.json();
        // Set messages to body of request
        const { messages } = body;

        // Check to make sure a userId exists
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check to make sure openai is configured 
        if (!openai) {
            return new NextResponse("OpenAI API Key not configured", { status:500 });
        }

        // Check to make sure there is a message
        if (!messages) {
            return new NextResponse("Messages are required", { status: 400 });
        }

        // Check to see if free trial has expired by checking the count from Api calls
        const freeTrial = await checkApiLimit();
        const isPro = await checkSubscription();
        if (!freeTrial && !isPro) {
            return new NextResponse("Free trial has expired", { status: 403 });
        }

        // Create the message from openai response
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages
        });
        // Add the count to ApiLimit to increment by 1
        if (!isPro) {
            await increaseApiLimit();
        }
        // return the response from openai
        return NextResponse.json(response.choices[0].message);

    } catch (error) {
        // Create the consold error messages related to conversation
        console.log("[CONVERSATION_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}