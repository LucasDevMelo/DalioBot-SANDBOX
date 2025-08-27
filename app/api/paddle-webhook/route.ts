// app/api/paddle-webhook/route.ts
// FINAL PRODUCTION VERSION - Security check via Direct API (fetch) + lifetime fallback + plan change fix

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// --- Firebase Admin Initialization ---
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ [Webhook] Firebase Admin SDK initialized.');
  }
} catch (error: any) {
  console.error('❌ [Webhook] ERROR INITIALIZING FIREBASE ADMIN:', error.message);
}

const db = admin.firestore();

// Lifetime plan IDs (adjust according to your Paddle plans)
const LIFETIME_PLANS = ['pri_01k2032px4vc7nvy9vvrct6dhe'];

export async function POST(req: NextRequest) {
  console.log('📩 [Webhook] New request received from Paddle');

  try {
    const event = await req.json();
    const { event_type, data } = event;

    // ========================================================================================
    // VERIFICATION VIA PADDLE API (only for transactions)
    // ========================================================================================
    if (data.id && data.id.startsWith('txn_')) {
      console.log(`[INFO] Verifying transaction with Paddle API via fetch: ${data.id}`);

      const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
      const paddleApiUrl = `https://sandbox-api.paddle.com/transactions/${data.id}`;

      const response = await fetch(paddleApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `❌ [Webhook] Failed to verify transaction on Paddle API. Status: ${response.status}. Body: ${errorBody}`
        );
        throw new Error('Failed to verify the transaction with the Paddle API.');
      }

      const transactionResponse = await response.json();
      const transactionStatus = transactionResponse?.data?.status;

      if (transactionStatus !== 'completed') {
        console.warn(`[WARN] Transaction ${data.id} is not complete. Status: ${transactionStatus}. Ignoring.`);
        return NextResponse.json({ message: 'Transaction not completed' });
      }
      console.log(`✅ [Webhook] Transaction ${data.id} verified successfully via fetch.`);
    } else {
      console.log(`[INFO] Event ${event_type} is not a transaction, skipping API verification.`);
    }

    // ========================================================================================
    // USER LOOKUP BY EMAIL
    // ========================================================================================
    const userEmail = data?.custom_data?.userEmail;

    if (!userEmail) {
      console.warn('⚠️ [Webhook] No userEmail, ignoring event.');
      return NextResponse.json({ message: 'No userEmail, event ignored.' }, { status: 200 });
    }

    const userQuery = await db.collection('users').where('email', '==', userEmail).limit(1).get();

    if (userQuery.empty) {
      console.error(`❌ [Webhook] No user found with email: ${userEmail}`);
      return NextResponse.json({ message: `User with email ${userEmail} not found.` }, { status: 200 });
    }

    const userDoc = userQuery.docs[0];
    const userRef = userDoc.ref;
    const firebaseUid = userDoc.id;

    console.log(`ℹ️ [Webhook] User found by email. UID: ${firebaseUid}`);

    // ========================================================================================
    // EVENT PROCESSING
    // ========================================================================================
    switch (event_type) {
      case 'transaction.completed':
      case 'subscription.created':
      case 'subscription.activated': {
        const priceId = data?.items?.[0]?.price?.id || null;
        const isLifetime = LIFETIME_PLANS.includes(priceId);
        const customerPortalUrl = isLifetime
          ? 'VITALICIO'
          : data?.management_urls?.customer_portal_url || null;
        const paddleSubscriptionId = data.subscription_id || data.id || null;

        await userRef.set(
          {
            plano: priceId,
            assinaturaAtiva: true,
            paddleCustomerPortal: customerPortalUrl,
            paddleSubscriptionId: paddleSubscriptionId,
            atualizadoEm: new Date(),
          },
          { merge: true }
        );

        console.log(`✅ [Webhook] Subscription ACTIVATED (${isLifetime ? 'Lifetime' : 'Recurring'}) for user ${firebaseUid}`);
        break;
      }
      
      // ===== MODIFICATION START =====
      // This case now correctly handles plan changes (upgrades/downgrades)
      case 'subscription.updated': {
        const newPriceId = data?.items?.[0]?.price?.id;
        
        const updateData: { [key: string]: any } = {
            assinaturaAtiva: data.status === 'active',
            atualizadoEm: new Date(),
        };

        // Only update the plan if a new plan ID is present in the webhook payload
        if (newPriceId) {
            updateData.plano = newPriceId;
        }

        await userRef.set(updateData, { merge: true });

        console.log(`✅ [Webhook] Subscription UPDATED for user ${firebaseUid}. ${newPriceId ? `New plan: ${newPriceId}.` : ''} Status: ${data.status}`);
        break;
      }
      // ===== MODIFICATION END =====

      case 'subscription.cancelled': {
        await userRef.set(
          {
            assinaturaAtiva: false,
            atualizadoEm: new Date(),
          },
          { merge: true }
        );
        console.log(`✅ [Webhook] Subscription CANCELLED for user ${firebaseUid}`);
        break;
      }
      default:
        console.log(`ℹ️ [Webhook] Event ignored: ${event_type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ [Webhook] GENERAL processing error:', error.message);
    return new NextResponse('Error processing webhook.', { status: 500 });
  }
}
