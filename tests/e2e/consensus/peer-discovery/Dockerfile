FROM node:20-alpine

COPY index.js .
COPY package.json .

RUN npm install

CMD [ "node", "index.js" ]
