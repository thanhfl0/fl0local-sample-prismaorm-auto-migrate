const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();
const app = express();
const stripe = Stripe(process.env.STRIPE_PUBLIC_KEY);

app.use(express.json());

app.get('/healthcheck', async (req, res) => {
  res.json({
    test_env: process.env.TEST_ENV || 'No Value'
  });
});

// GET products
app.get('/products', async (req, res) => {
  const products = await prisma.product.findMany({
    orderBy: [{updatedAt: 'desc'}]
  });
  res.json(products);
});

// CREATE product
app.post(`/products`, async (req, res) => {
  const {name, description, quantity, image} = req.body;

  const stripeProduct = await stripe.products.create({
    name: name,
    description: description,
    images: [image]
  });

  const product = await prisma.product.create({
    data: {
      name: name,
      description: description,
      image: image,
      quantity: quantity,
      updatedAt: new Date(),
      stripeProductId: stripeProduct.id,
    },
  });

  res.send(product);
});

// UPDATE product
app.put('/products/:id', async (req, res) => {
  const {id} = req.params;
  const {name, description, quantity, image} = req.body;

  const product = await prisma.product.update({
    where: {id: Number(id)},
    data: {
      name: name,
      description: description,
      image: image,
      quantity: quantity,
      updatedAt: new Date(),
    },
  });

  res.json(product);
});

// CREATE/UPDATE price
app.put('/products/:id/price', async (req, res) => {
  const {id} = req.params;
  const {price} = req.body;

  let product = await prisma.product.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (product == null) {
    res.status(400).end();
    return;
  }

  if (product.stripePriceId == null) {
    const stripePrice = await stripe.prices.create({
      unit_amount: price,
      currency: 'aud',
      product: product.stripeProductId
  });

    product = await prisma.product.update({
      where: {id: Number(id)},
      data: {
        stripePriceId: stripePrice.id
      }
    });
  }

  res.json(product);
});

// DELETE product
app.delete(`/products/:id`, async (req, res) => {
  const {id} = req.params;
  await prisma.product.delete({
    where: {
      id: Number(id),
    },
  });

  res.status(204).end();
});

// CREATE checkout session
app.post(`/products/:id/checkout-sessions`, async (req, res) => {
  const {id} = req.params;
  const {quantity, successUrl, cancelUrl} = req.body;

  const product = await prisma.product.findUnique({
    where: {
      id: Number(id),
    },
  });

  if (product == null) {
    res.status(400).end();
    return;
  }

  const session = await stripe.checkout.sessions.create({
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        price: product.stripePriceId,
      quantity: quantity,
},
],
  mode: 'payment',
    metadata: {
    'product_id': id
  },
});

  res.send(session);
});

// Stripe webhook
// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = "whsec_FesMzgWQ5eEnwoo0rS7V1N6YrHCY1WT4";
app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  // const sig = request.headers['stripe-signature'];
  // let event;
  //
  // try {
  //     event = stripe.webhooks.constructEvent(request.body, sig!, endpointSecret);
  // } catch (err) {
  //     response.status(400).send(`Webhook Error: ${err}`);
  //     return;
  // }

  // Testing only
  let event = request.body;

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      if (session.payment_status === "paid") {
        const productId = session.metadata['product_id'];

        let product = await prisma.product.findUnique({
          where: {id: Number(productId)}
        });

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const quantity = lineItems.data[0].quantity;

        product = await prisma.product.update({
          where: {id: Number(productId)},
          data: {
            quantity: product.quantity - quantity,
          updatedAt: new Date(),
      },
      });
        response.json(product);
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

const server = app.listen(3000, () =>
  console.log(`
🚀 Server ready at: http://localhost:3000
`),
);
