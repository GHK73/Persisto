FROM node:18-alpine

WORKDIR /app

RUN apk update && apk add --no-cache g++ make python3

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

CMD ["node","server.js"]
