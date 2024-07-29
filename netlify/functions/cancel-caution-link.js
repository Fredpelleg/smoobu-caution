const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const smoobuEvent = JSON.parse(event.body);

  switch (smoobuEvent.event) {
    case 'booking.cancelled':
      const booking = smoobuEvent.data;
      console.log(`Booking cancelled: ${booking.id}`);

      try {
        const paymentIntentId = booking.paymentIntentId; // Assurez-vous que l'ID du PaymentIntent est stocké dans la réservation
        const cancellation = await stripe.paymentIntents.cancel(paymentIntentId);

        // Mettre à jour la réservation Smoobu pour confirmer l'annulation de la caution
        const smoobuUpdateUrl = `https://api.smoobu.com/api/v1/bookings/${booking.id}`;
        const updateResponse = await fetch(smoobuUpdateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SMOOBU_API_TOKEN}`,
          },
          body: JSON.stringify({
            fields: {
              CautionStatus: 'Cancelled' // Assurez-vous que ce champ personnalisé existe dans Smoobu
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to update Smoobu booking: ${updateResponse.statusText}`);
        }

        console.log(`Caution cancelled and booking updated: ${booking.id}`);

      } catch (err) {
        console.error(`Failed to cancel caution or update Smoobu: ${err.message}`);
      }

      break;
    default:
      console.log(`Unhandled event type ${smoobuEvent.event}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
