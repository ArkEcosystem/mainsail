FROM node:21-alpine

COPY index.js .
COPY package.json .

RUN npm install

CMD [ "node", "index.js" ]
