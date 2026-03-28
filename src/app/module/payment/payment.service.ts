//* eslint-disable @typescript-eslint/no-explicit-any *//
import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { PaymentStatus } from "../../../generated/prisma/enums";

const handlerStripeWebhookEvent = async (event: Stripe.Event) => {
    // ✅ Prevent duplicate processing (idempotency)
    const existingPayment = await prisma.payment.findFirst({
        where: {
            stripeEventId: event.id,
        },
    });

    if (existingPayment) {
        console.log(`Event ${event.id} already processed. Skipping`);
        return { message: `Event ${event.id} already processed. Skipping` };
    }

    switch (event.type) {

        // ✅ SUCCESS PAYMENT
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            const appointmentId = session.metadata?.appointmentId;
            const paymentId = session.metadata?.paymentId;

            if (!appointmentId || !paymentId) {
                console.error("Missing appointmentId or paymentId in session metadata");
                return { message: "Missing appointmentId or paymentId in session metadata" };
            }

            // Optional validation (good practice)
            const product = await prisma.product.findUnique({
                where: { id: appointmentId },
            });

            if (!product) {
                console.error(`Product with id ${appointmentId} not found`);
                return { message: `Product with id ${appointmentId} not found` };
            }

            const status =
                session.payment_status === "paid"
                    ? PaymentStatus.PAID
                    : PaymentStatus.UNPAID;

            await prisma.$transaction(async (tx) => {
                // ✅ ONLY update Payment (correct design)
                await tx.payment.update({
                    where: {
                        id: paymentId,
                    },
                    data: {
                        stripeEventId: event.id,
                        status,
                        paymentGatewayData: JSON.parse(JSON.stringify(session)),
                    },
                });
            });

            console.log(
                `Processed checkout.session.completed for appointment ${appointmentId} and payment ${paymentId}`
            );
            break;
        }

        // ❌ EXPIRED SESSION
        case "checkout.session.expired": {
            const session = event.data.object as Stripe.Checkout.Session;

            console.log(
                `Checkout session ${session.id} expired. Marking payment as UNPAID.`
            );

            // (Optional) update payment if you store mapping
            break;
        }

        // ❌ FAILED PAYMENT
        case "payment_intent.payment_failed": {
            const intent = event.data.object as Stripe.PaymentIntent;

            console.log(`Payment intent ${intent.id} failed.`);

            // (Optional) update payment status here if needed
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return { message: `Webhook Event ${event.id} processed successfully` };
};

export const PaymentService = {
    handlerStripeWebhookEvent,
};