const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const smoobuEvent = JSON.parse(event.body);

  switch (smoobuEvent.event) {
    case 'booking.created':
      const booking = smoobuEvent.data;
      console.log(`New booking created: ${booking.id}`);

      const cautionAmount = 10000; // Montant de la caution en centimes (par exemple, 100 euros)
      const currency = 'eur'; // Devise

      try {
        const paymentLink = await stripe.paymentLinks.create({
          line_items: [
            {
              price_data: {
                currency: currency,
                product_data: {
                  name: `Caution for Booking ${booking.id}`,
                },
                unit_amount: cautionAmount,
              },
              quantity: 1,
            },
          ],
          metadata: {
            bookingId: booking.id,
            type: 'caution'
          },
        });

        // Mettre à jour la réservation Smoobu avec le lien de paiement de la caution
        const smoobuUpdateUrl = `https://api.smoobu.com/api/v1/bookings/${booking.id}`;
        const updateResponse = await fetch(smoobuUpdateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SMOOBU_API_TOKEN}`,
          },
          body: JSON.stringify({
            fields: {
              CautionPaymentLink: paymentLink.url // Assurez-vous que ce champ personnalisé existe dans Smoobu
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to update Smoobu booking: ${updateResponse.statusText}`);
        }

        console.log(`Payment link created and added to booking ${booking.id}: ${paymentLink.url}`);

      } catch (err) {
        console.error(`Failed to create PaymentLink or update Smoobu: ${err.message}`);
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
