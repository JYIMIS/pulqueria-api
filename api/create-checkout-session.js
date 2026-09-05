const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { items, email, customerName, phone, address, notes, orderType } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No se enviaron productos.' });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'mxn',
        product_data: {
          name: item.name,
          description: `La Pulquería - ${orderType === 'domicilio' || orderType === 'delivery' ? 'Entrega a Domicilio' : 'Recoger sin filas'}`,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity || item.qty || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      metadata: {
        negocio: 'La Pulquería',
        cliente: customerName || 'No especificado',
        telefono: phone || 'No especificado',
        direccion: address || 'Recoge en sucursal',
        notas: notes || 'Sin notas',
        tipo_pedido: orderType || 'domicilio',
      },
      success_url: `${req.headers.origin || 'https://www.homemexaglobal.com'}?success=true`,
      cancel_url: `${req.headers.origin || 'https://www.homemexaglobal.com'}?canceled=true`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error en Stripe Checkout:', error);
    return res.status(500).json({ error: error.message });
  }
};
