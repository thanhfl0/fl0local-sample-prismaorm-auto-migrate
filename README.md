Step to run project:

- Edit postgres connection string in prisma/schema.prisma
- Update stripe secret key in `index.js`
```
const stripe = Stripe('<your secret key>');
```
- Run `npm i`
- Run migration `npx prisma migrate dev --name init`
- Run express server by command `npm run dev`

I attach postman collection in zip file, please go to Postman -> File -> Import to import collections I made to test out
