FROM node:16-slim

RUN mkdir app
COPY . /app
WORKDIR /app

RUN yarn install
RUN yarn test
