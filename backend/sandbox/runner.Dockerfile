FROM node:20-alpine

RUN apk add --no-cache docker-cli

WORKDIR /runner
COPY sandbox/runnerServer.js ./runnerServer.js

ENV RUNNER_PORT=8090
EXPOSE 8090

CMD ["node", "runnerServer.js"]
